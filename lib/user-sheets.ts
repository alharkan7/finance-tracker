import fs from 'fs';
import path from 'path';

interface UserSheet {
  userId: string;
  email: string;
  sheetId: string;
  createdAt: string;
  updatedAt: string;
}

// For development - use a simple JSON file storage
// In production, you'd want to use a proper database
const STORAGE_FILE = path.join(process.cwd(), 'data', 'user-sheets.json');

// Ensure data directory exists
const dataDir = path.dirname(STORAGE_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize storage file if it doesn't exist
if (!fs.existsSync(STORAGE_FILE)) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify([], null, 2));
}

export async function getUserSheet(userId: string): Promise<UserSheet | null> {
  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    const userSheets: UserSheet[] = JSON.parse(data);
    return userSheets.find(sheet => sheet.userId === userId) || null;
  } catch (error) {
    console.error('Error reading user sheets:', error);
    return null;
  }
}

export async function setUserSheet(userId: string, email: string, sheetId: string): Promise<UserSheet> {
  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    const userSheets: UserSheet[] = JSON.parse(data);
    
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
    } else {
      userSheets[existingIndex] = userSheet;
    }
    
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(userSheets, null, 2));
    return userSheet;
  } catch (error) {
    console.error('Error saving user sheet:', error);
    throw new Error('Failed to save user sheet configuration');
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
