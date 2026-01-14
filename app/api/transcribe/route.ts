import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';

// Valid options for expense form
const EXPENSE_SUBJECTS = [
    'Al (Personal)',
    'Nurin (Personal)',
    'Al (Family)',
    'Nurin (Family)',
    'Al (Lainnya)',
    'Nurin (Lainnya)',
    'Al & Nurin',
];

const EXPENSE_CATEGORIES = [
    '🍔 Food & Beverages',
    '🥫 Snacks',
    '👼🏼 Baby',
    '🛒 Groceries',
    '🚗 Transportation',
    '🎓 Education',
    '🍿 Entertainment',
    '🎁 Gift & Donations',
    '😊 Family',
    '💊 Health',
    '🧾 Bill & Utilities',
    '💵 Fees & Charges',
    '🛍️ Shopping',
    '💰 Investment',
    '🏠 Accommodation',
    '🎲 Others',
];

// Valid options for income form
const INCOME_SUBJECTS = ['Al', 'Nurin'];

const INCOME_CATEGORIES = [
    '💰 Salary',
    '✍🏼 Event',
    '💼 Business',
    '🎁 Gift',
    '🎲 Others',
];

// Gemini response schema for structured output
const expenseSchema = {
    type: SchemaType.OBJECT as const,
    properties: {
        subject: {
            type: SchemaType.STRING as const,
            description: 'The person responsible for this expense',
            enum: EXPENSE_SUBJECTS,
        },
        category: {
            type: SchemaType.STRING as const,
            description: 'The category of expense',
            enum: EXPENSE_CATEGORIES,
        },
        amount: {
            type: SchemaType.NUMBER as const,
            description: 'The amount in Indonesian Rupiah (IDR). Convert any mentioned currency or approximate values.',
        },
        description: {
            type: SchemaType.STRING as const,
            description: 'Optional notes or description about the expense',
        },
        date: {
            type: SchemaType.STRING as const,
            description: 'The date in YYYY-MM-DD format. Use today if not specified.',
        },
        reimbursed: {
            type: SchemaType.STRING as const,
            description: 'Whether this expense is reimbursable',
            enum: ['TRUE', 'FALSE'],
        },
    },
    required: ['amount'] as const,
};

const incomeSchema = {
    type: SchemaType.OBJECT as const,
    properties: {
        subject: {
            type: SchemaType.STRING as const,
            description: 'The person who received this income',
            enum: INCOME_SUBJECTS,
        },
        category: {
            type: SchemaType.STRING as const,
            description: 'The category of income',
            enum: INCOME_CATEGORIES,
        },
        amount: {
            type: SchemaType.NUMBER as const,
            description: 'The amount in Indonesian Rupiah (IDR)',
        },
        description: {
            type: SchemaType.STRING as const,
            description: 'Optional notes or description about the income',
        },
        date: {
            type: SchemaType.STRING as const,
            description: 'The date in YYYY-MM-DD format. Use today if not specified.',
        },
    },
    required: ['amount'] as const,
};

export async function POST(request: NextRequest) {
    try {
        // Get form type from query params (expense or income)
        const { searchParams } = new URL(request.url);
        const formType = searchParams.get('type') || 'expense';

        const formData = await request.formData();
        const audioFile = formData.get('audio') as File | null;

        if (!audioFile) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        // Check for required API keys
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json(
                { error: 'GROQ_API_KEY is not configured' },
                { status: 500 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY is not configured' },
                { status: 500 }
            );
        }

        // Step 1: Transcribe audio using Groq Whisper
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-large-v3-turbo',
            temperature: 0,
            response_format: 'verbose_json',
        });

        const transcribedText = transcription.text;

        if (!transcribedText || transcribedText.trim() === '') {
            return NextResponse.json(
                { error: 'No speech detected in the audio' },
                { status: 400 }
            );
        }

        // Step 2: Use Gemini to structure the transcribed text
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const isExpense = formType === 'expense';
        const schema = isExpense ? expenseSchema : incomeSchema;
        const subjects = isExpense ? EXPENSE_SUBJECTS : INCOME_SUBJECTS;
        const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: schema as unknown as ResponseSchema,
            },
        });

        const prompt = `You are a finance tracker assistant. Parse the following voice input and extract the ${formType} information.

Voice input (transcribed): "${transcribedText}"

Today's date: ${today}

Instructions:
1. Extract the amount (required). The user might say amounts in Indonesian like "dua puluh ribu" (20000), "seratus ribu" (100000), "satu juta" (1000000). Convert to numbers.
2. Try to match the subject to one of these options: ${subjects.join(', ')}. If the user mentions "Al", "saya" (me), or similar, use "${subjects[0]}". If they mention "Nurin" or "istri" (wife), use "${subjects.includes('Nurin') ? 'Nurin' : subjects[1]}".
3. Try to match the category to one of these options based on context: ${categories.map(c => c.replace(/^[^\s]+\s/, '')).join(', ')}.
4. If a date is mentioned, convert to YYYY-MM-DD format. Words like "kemarin" mean yesterday, "hari ini" or if not specified means today (${today}).
5. For the description/notes field, format the text in Title Case (capitalize the first letter of each word). For example: "Beli Makan di Kantin", "Bayar Parkir Motor", "Ongkos Ojol ke Kantor".
${isExpense ? '6. Set reimbursed to "TRUE" if the user mentions it should be reimbursed, otherwise "FALSE".' : ''}

Extract the structured data from the voice input. Only include fields that can be reasonably inferred from the input.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse the JSON response
        const structuredData = JSON.parse(responseText);

        return NextResponse.json({
            transcript: transcribedText,
            structured: structuredData,
        });
    } catch (error) {
        console.error('Transcription/parsing error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Processing failed' },
            { status: 500 }
        );
    }
}
