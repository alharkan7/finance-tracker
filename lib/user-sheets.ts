import fs from 'fs';
import path from 'path';

interface UserSheet {
  userId: string;
  email: string;
  sheetId: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback storage if file operations fail
const memoryStorage = new Map<string, UserSheet>();

// For development - use a simple JSON file storage
// In production, you'd want to use a proper database
const STORAGE_FILE = path.join(process.cwd(), 'data', 'user-sheets.json');

// Ensure data directory exists
const dataDir = path.dirname(STORAGE_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize storage file if it doesn't exist or is empty
if (!fs.existsSync(STORAGE_FILE)) {
  console.log('Creating new user-sheets.json file');
  fs.writeFileSync(STORAGE_FILE, JSON.stringify([], null, 2));
} else {
  // Check if file is empty and initialize if needed
  try {
    const content = fs.readFileSync(STORAGE_FILE, 'utf8');
    if (!content.trim()) {
      console.log('Initializing empty user-sheets.json file');
      fs.writeFileSync(STORAGE_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Error checking/initializing storage file:', error);
    fs.writeFileSync(STORAGE_FILE, JSON.stringify([], null, 2));
  }
}

export async function getUserSheet(userId: string): Promise<UserSheet | null> {
  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    const userSheets: UserSheet[] = JSON.parse(data);
    return userSheets.find(sheet => sheet.userId === userId) || null;
  } catch (error) {
    console.error('Error reading user sheets from file, checking memory storage:', error);
    // Fallback to memory storage
    return memoryStorage.get(userId) || null;
  }
}

export async function setUserSheet(userId: string, email: string, sheetId: string): Promise<UserSheet> {
  try {
    console.log('Setting user sheet for:', { userId, email, sheetId });
    console.log('Storage file path:', STORAGE_FILE);
    console.log('Storage file exists:', fs.existsSync(STORAGE_FILE));
    
    let userSheets: UserSheet[] = [];
    
    // Try to read existing data
    if (fs.existsSync(STORAGE_FILE)) {
      try {
        const data = fs.readFileSync(STORAGE_FILE, 'utf8');
        console.log('Existing file content:', data);
        
        if (data.trim()) {
          userSheets = JSON.parse(data);
        }
      } catch (parseError) {
        console.error('Error parsing existing file:', parseError);
        // If file is corrupted, start fresh
        userSheets = [];
      }
    }
    
    const existingIndex = userSheets.findIndex(sheet => sheet.userId === userId);
    const now = new Date().toISOString();
    
    const userSheet: UserSheet = {
      userId,
      email,
      sheetId,
      createdAt: existingIndex === -1 ? now : userSheets[existingIndex].createdAt,
      updatedAt: now
    };
    
    if (existingIndex === -1) {
      userSheets.push(userSheet);
      console.log('Adding new user sheet');
    } else {
      userSheets[existingIndex] = userSheet;
      console.log('Updating existing user sheet');
    }
    
    const jsonContent = JSON.stringify(userSheets, null, 2);
    console.log('Writing content:', jsonContent);
    
    fs.writeFileSync(STORAGE_FILE, jsonContent);
    console.log('Successfully saved user sheet configuration');
    
    // Also save to memory storage as backup
    memoryStorage.set(userId, userSheet);
    
    return userSheet;
  } catch (error) {
    console.error('Error saving user sheet to file:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    
    // Fallback to memory storage
    console.log('Falling back to memory storage');
    const now = new Date().toISOString();
    const userSheet: UserSheet = {
      userId,
      email,
      sheetId,
      createdAt: now,
      updatedAt: now
    };
    
    memoryStorage.set(userId, userSheet);
    console.log('Successfully saved user sheet to memory storage');
    
    return userSheet;
  }
}

export async function removeUserSheet(userId: string): Promise<boolean> {
  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    const userSheets: UserSheet[] = JSON.parse(data);
    
    const filteredSheets = userSheets.filter(sheet => sheet.userId !== userId);
    
    if (filteredSheets.length === userSheets.length) {
      return false; // No sheet found for user
    }
    
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(filteredSheets, null, 2));
    return true;
  } catch (error) {
    console.error('Error removing user sheet:', error);
    return false;
  }
}

export async function getAllUserSheets(): Promise<UserSheet[]> {
  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading all user sheets:', error);
    return [];
  }
}

// Helper function to generate a unique user ID from session
export function getUserId(session: any): string {
  // Use email as unique identifier, or you could use session.user.id if available
  return session.user.email;
}
