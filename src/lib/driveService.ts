// Google Drive API Service
// Handles interaction with Google Drive to count and list files in folders

import { getAccessToken } from './auth';

const API_KEY = "AIzaSyDltPnR5hhwfDrjlwi7lS78R_kDIZbQpWo";
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

export interface DriveSearchResult extends DriveFile {
  parentName?: string;
  path?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  size?: string;
  parents?: string[];
  iconLink?: string;
  thumbnailLink?: string;
  description?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  createdTime: Date;
  modifiedTime: Date;
  link: string;
}

/**
 * Extract file ID from Google Drive file link
 */
export function extractFileId(fileLink: string): string | null {
  if (!fileLink || fileLink.trim() === "" || fileLink.includes("No Files Yet")) {
    return null;
  }

  try {
    // Check if it's already an ID
    if (/^[a-zA-Z0-9_-]{25,}$/.test(fileLink)) return fileLink;

    const url = new URL(fileLink);
    const pathParts = url.pathname.split('/');

    // Format: /file/d/FILE_ID/view
    const dIndex = pathParts.indexOf('d');
    if (dIndex !== -1 && pathParts.length > dIndex + 1) {
      return pathParts[dIndex + 1];
    }

    // Format: /open?id=FILE_ID
    const idParam = url.searchParams.get('id');
    if (idParam) return idParam;

    return null;
  } catch (error) {
    console.error("Invalid file link:", fileLink, error);
    return null;
  }
}

/**
 * Extract folder ID from Google Drive folder link
 */
export function extractFolderId(folderLink: string): string | null {
  if (!folderLink || folderLink.trim() === "" || folderLink.includes("No Files Yet")) {
    return null;
  }

  try {
    const url = new URL(folderLink);
    const pathParts = url.pathname.split('/');
    const foldersIndex = pathParts.indexOf('folders');

    if (foldersIndex !== -1 && pathParts.length > foldersIndex + 1) {
      return pathParts[foldersIndex + 1];
    }

    return null;
  } catch (error) {
    console.error("Invalid folder link:", folderLink, error);
    return null;
  }
}

/**
 * Get count of files in a Google Drive folder
 * @param folderLink - Google Drive folder URL
 * @returns Number of files in the folder
 */
export async function getFolderFileCount(folderLink: string): Promise<number> {
  const folderId = extractFolderId(folderLink);

  if (!folderId) {
    return 0;
  }

  try {
    // Query for files in the folder (excluding trashed items and the Archive folder)
    const query = `'${folderId}' in parents and trashed=false and name != 'Archive'`;
    const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id)&key=${API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Drive API error for folder ${folderId}:`, response.status, response.statusText);
      return 0;
    }

    const data = await response.json();
    return data.files?.length || 0;
  } catch (error) {
    console.error("Error fetching folder file count:", error);
    return 0;
  }
}

/**
 * List all files in a Google Drive folder with metadata
 * @param folderLink - Google Drive folder URL
 * @returns Array of file metadata
 */
export async function listFolderFiles(folderLink: string): Promise<DriveFile[]> {
  const folderId = extractFolderId(folderLink);

  if (!folderId) {
    return [];
  }

  try {
    // Query for files in the folder (excluding trashed items and the Archive folder)
    const query = `'${folderId}' in parents and trashed=false and name != 'Archive'`;
    const fields = "files(id,name,mimeType,createdTime,modifiedTime,webViewLink,size,parents,description)";
    const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=${fields}&orderBy=createdTime desc&key=${API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Drive API error for folder ${folderId}:`, response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error listing folder files:", error);
    return [];
  }
}

/**
 * Get metadata for a specific file
 * @param fileId - Google Drive file ID
 * @returns File metadata
 */
export async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  try {
    const fields = "id,name,createdTime,modifiedTime,webViewLink";
    const url = `${DRIVE_API_BASE}/files/${fileId}?fields=${fields}&key=${API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Drive API error for file ${fileId}:`, response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    return {
      id: data.id,
      name: data.name,
      createdTime: new Date(data.createdTime),
      modifiedTime: new Date(data.modifiedTime),
      link: data.webViewLink,
    };
  } catch (error) {
    console.error("Error fetching file metadata:", error);
    return null;
  }
}

/**
 * Parse serial number from filename
 * Expected format: F/XX-YYY (e.g., F/11-001, F/19-004)
 */
export function parseSerialFromFilename(filename: string): string | null {
  const match = filename.match(/F\/\d+-\d+/i);
  return match ? match[0] : null;
}

/**
 * Batch get file counts for multiple folders
 * @param folderLinks - Array of Google Drive folder URLs
 * @returns Map of folder link to file count
 */
export async function batchGetFolderCounts(
  folderLinks: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  // Process in parallel for better performance
  const promises = folderLinks.map(async (link) => {
    const count = await getFolderFileCount(link);
    return { link, count };
  });

  const settled = await Promise.allSettled(promises);

  settled.forEach((result) => {
    if (result.status === "fulfilled") {
      results.set(result.value.link, result.value.count);
    }
  });

  return results;
}

/**
 * Batch get file lists for multiple folders
 * @param folderLinks - Array of Google Drive folder URLs
 * @returns Map of folder link to array of DriveFiles
 */
export async function batchGetFolderFiles(
  folderLinks: string[]
): Promise<Map<string, DriveFile[]>> {
  const results = new Map<string, DriveFile[]>();

  // Process in parallel for better performance
  const promises = folderLinks.map(async (link) => {
    const files = await listFolderFiles(link);
    return { link, files };
  });

  const settled = await Promise.allSettled(promises);

  settled.forEach((result) => {
    if (result.status === "fulfilled") {
      results.set(result.value.link, result.value.files);
    }
  });

  return results;
}

/**
 * Search across the Drive for files matching a query
 */
export async function searchProjectDrive(searchTerm: string): Promise<DriveSearchResult[]> {
  const token = await getAccessToken();
  if (!token) {
    console.error("No access token for Drive search");
    return [];
  }

  try {
    // Search for name containing term, not trashed
    const query = `name contains '${searchTerm}' and trashed = false`;
    const fields = "files(id,name,mimeType,webViewLink,parents,iconLink,thumbnailLink)";
    const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=15&key=${API_KEY}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Drive search failed: ${response.status}`);
    }

    const data = await response.json();
    const files: DriveSearchResult[] = data.files || [];

    // Try to resolve parent names for the first few results to show as "path"
    const resultsWithParents = await Promise.all(files.map(async (file) => {
      if (file.parents && file.parents.length > 0) {
        const parentName = await getParentName(file.parents[0], token);
        return { ...file, parentName, path: parentName };
      }
      return file;
    }));

    return resultsWithParents;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

const folderNameCache = new Map<string, string>();

async function getParentName(folderId: string, token: string): Promise<string> {
  if (folderNameCache.has(folderId)) return folderNameCache.get(folderId)!;

  try {
    const url = `${DRIVE_API_BASE}/files/${folderId}?fields=name&key=${API_KEY}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      folderNameCache.set(folderId, data.name);
      return data.name;
    }
  } catch (e) { }

  return "Unknown";
}

/**
 * Copy a file to a destination folder
 */
export async function copyDriveFile(
  fileIdOrLink: string,
  destinationFolderIdOrLink: string,
  newName: string
): Promise<DriveFile | null> {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token for Drive operations");

  const fileId = extractFileId(fileIdOrLink);
  const folderId = extractFolderId(destinationFolderIdOrLink);

  if (!fileId || !folderId) {
    throw new Error(`Invalid source file (${fileId}) or destination folder (${folderId})`);
  }

  try {
    const url = `${DRIVE_API_BASE}/files/${fileId}/copy?fields=id,name,webViewLink&key=${API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: newName,
        parents: [folderId]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      const message = err.error?.message || response.statusText;
      console.error("DEBUG: Drive API Error Details:", JSON.stringify(err, null, 2));
      throw new Error(`Drive copy failed: ${message} (Detail: ${JSON.stringify(err.error?.errors || [])})`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error copying file:", error);
    throw error;
  }
}

/**
 * Move a file to an "Archive" folder within its current parent
 */
export async function moveFileToArchive(
  fileId: string,
  parentFolderId: string
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token for Drive operations");

  try {
    // 1. Find or create "Archive" folder inside parentFolderId
    const searchQuery = `'${parentFolderId}' in parents and name = 'Archive' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchUrl = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(searchQuery)}&fields=files(id)&key=${API_KEY}`;

    const searchResponse = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let archiveFolderId: string;
    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      archiveFolderId = searchData.files[0].id;
    } else {
      // Create it
      const createResponse = await fetch(`${DRIVE_API_BASE}/files?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Archive',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId]
        })
      });
      const createData = await createResponse.json();
      archiveFolderId = createData.id;
    }

    // 2. Move file (remove current parent, add archive parent)
    // First get current parents to remove them
    const fileUrl = `${DRIVE_API_BASE}/files/${fileId}?fields=parents&key=${API_KEY}`;
    const fileResponse = await fetch(fileUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const fileData = await fileResponse.json();
    const oldParents = (fileData.parents || []).join(',');

    const moveUrl = `${DRIVE_API_BASE}/files/${fileId}?addParents=${archiveFolderId}&removeParents=${oldParents}&key=${API_KEY}`;
    const moveResponse = await fetch(moveUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: `originalParentId:${parentFolderId}|archivedAt:${new Date().toISOString()}`
      })
    });

    return moveResponse.ok;
  } catch (error) {
    console.error("Error moving file to archive:", error);
    throw error;
  }
}

/**
 * Restore a file from its "Archive" folder back to its parent
 */
export async function restoreFileFromArchive(
  fileId: string,
  originalParentId: string
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token for Drive operations");

  try {
    // 1. Get current parents (which should be the Archive folder)
    const fileUrl = `${DRIVE_API_BASE}/files/${fileId}?fields=parents&key=${API_KEY}`;
    const fileResponse = await fetch(fileUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const fileData = await fileResponse.json();
    const archiveParents = (fileData.parents || []).join(',');

    // 2. Move file back to originalParentId
    const moveUrl = `${DRIVE_API_BASE}/files/${fileId}?addParents=${originalParentId}&removeParents=${archiveParents}&key=AIzaSyDltPnR5hhwfDrjlwi7lS78R_kDIZbQpWo`;
    const moveResponse = await fetch(moveUrl, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return moveResponse.ok;
  } catch (error) {
    console.error("Error restoring file from archive:", error);
    throw error;
  }
}

/**
 * Permanently delete a file from Google Drive
 * @param fileId - ID of the file to delete
 */
export async function permanentlyDeleteDriveFile(fileId: string): Promise<boolean> {
  const token = await getAccessToken();
  const url = `${DRIVE_API_BASE}/files/${fileId}?key=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error deleting file:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in permanentlyDeleteDriveFile:", error);
    return false;
  }
}

/**
 * Check if the application has write permission to Google Drive
 * Tries to create a small test file and then deletes it.
 */
export async function checkDriveWritePermission(): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, message: "No access token available. Please sign in." };
    }

    // 1. Try to create a file
    const createUrl = `${DRIVE_API_BASE}/files?uploadType=media&key=${API_KEY}`;
    const metadata = {
      name: 'qms_write_test.txt',
      mimeType: 'application/vnd.google-apps.document', // Use Google Docs mimeType for broader compatibility
      description: 'Temporary file to test QMS write permissions'
    };

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      return {
        success: false,
        message: `Failed to create file: ${errorData.error?.message || createResponse.statusText}`
      };
    }

    const file = await createResponse.json();
    const fileId = file.id;

    // 2. Try to delete the file immediately
    if (fileId) {
      await permanentlyDeleteDriveFile(fileId);
    }

    return { success: true, message: "Write permission verified successfully." };

  } catch (error: any) {
    console.error("Drive permission check failed:", error);
    return { success: false, message: `Network or API error: ${error.message}` };
  }
}

/**
 * Search for all archived files across the project
 */
export async function listAllArchivedFiles(): Promise<DriveFile[]> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    // Search for all folders named 'Archive'
    const folderQuery = "name = 'Archive' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const folderUrl = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(folderQuery)}&fields=files(id)&key=AIzaSyDltPnR5hhwfDrjlwi7lS78R_kDIZbQpWo`;

    const folderResponse = await fetch(folderUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const folderData = await folderResponse.json();
    const archiveFolderIds = (folderData.files || []).map((f: any) => f.id);

    if (archiveFolderIds.length === 0) return [];

    // Now search for all files in any of these Archive folders
    const allArchivedFiles: DriveFile[] = [];
    const chunkSize = 15;
    for (let i = 0; i < archiveFolderIds.length; i += chunkSize) {
      const chunk = archiveFolderIds.slice(i, i + chunkSize);
      const fileQuery = `(${chunk.map(id => `'${id}' in parents`).join(' or ')}) and trashed = false`;
      const fileUrl = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(fileQuery)}&fields=files(id,name,mimeType,createdTime,modifiedTime,webViewLink,parents,description)&orderBy=createdTime desc&key=AIzaSyDltPnR5hhwfDrjlwi7lS78R_kDIZbQpWo`;

      const fileResponse = await fetch(fileUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const fileData = await fileResponse.json();
      if (fileData.files) {
        allArchivedFiles.push(...fileData.files);
      }
    }

    return allArchivedFiles;
  } catch (error) {
    console.error("Error listing archived files:", error);
    return [];
  }
}

/**
 * Check for and delete expired archived files (older than 30 days)
 * Returns the number of deleted files
 */
export async function checkAndCleanupExpiredArchives(): Promise<number> {
  const token = await getAccessToken();
  if (!token) return 0;

  try {
    const files = await listAllArchivedFiles();
    let deletedCount = 0;
    const now = new Date();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.description || !file.description.includes('archivedAt:')) continue;

      const match = file.description.match(/archivedAt:([^|]+)/);
      if (match && match[1]) {
        const archivedDate = new Date(match[1]);
        if (now.getTime() - archivedDate.getTime() > THIRTY_DAYS_MS) {
          // Double check permissions/safety here?
          // We assume if it has the tag, it's safe to delete
          await permanentlyDeleteDriveFile(file.id);
          deletedCount++;
        }
      }
    }
    return deletedCount;
  } catch (error) {
    console.error("Auto-cleanup error:", error);
    return 0;
  }
}

export async function createDriveFolder(name: string, parentFolderId?: string): Promise<{ id: string; name: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token for Drive operations");
  const url = `${DRIVE_API_BASE}/files?key=${API_KEY}`;
  const body: any = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentFolderId) body.parents = [parentFolderId];
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to create folder");
  }
  const data = await res.json();
  return { id: data.id, name: data.name };
}

export async function uploadFileToDrive(file: File, folderLink?: string, nameOverride?: string): Promise<DriveFile | null> {
  const token = await getAccessToken();
  if (!token) throw new Error("No access token for Drive operations");
  let parentId: string | undefined;
  if (folderLink) {
    const fid = extractFolderId(folderLink);
    if (fid) parentId = fid;
  }
  const metadata: any = {};
  if (nameOverride) metadata.name = nameOverride;
  if (parentId) metadata.parents = [parentId];
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file, nameOverride || file.name);
  const url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink&key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Upload failed");
  }
  return await res.json();
}
