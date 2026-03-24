import { storage, ref, uploadBytes, getDownloadURL, deleteObject } from './firebase';

/**
 * Upload a receipt image to Firebase Storage
 * @param userId - The user's ID
 * @param transactionId - The transaction ID
 * @param file - The image file (JPEG or PNG)
 * @returns Object with download URL and storage path
 */
export async function uploadReceipt(
  userId: string,
  transactionId: string,
  file: File
): Promise<{ url: string; path: string }> {
  // Validate file type
  if (!file.type.match(/^image\/(jpeg|png)$/)) {
    throw new Error('Only JPEG and PNG images are allowed');
  }
  
  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image must be less than 10MB');
  }
  
  // Generate unique filename with nanoid-like approach
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const uniqueId = crypto.randomUUID().slice(0, 10);
  const fileName = `${uniqueId}.${ext}`;
  
  // Create storage reference
  const storagePath = `receipts/${userId}/${transactionId}/${fileName}`;
  const storageRef = ref(storage, storagePath);
  
  // Upload the file
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      userId,
      transactionId
    }
  });
  
  // Get the download URL
  const url = await getDownloadURL(storageRef);
  
  return { url, path: storagePath };
}

/**
 * Delete a receipt from Firebase Storage
 * @param path - The full storage path of the receipt
 */
export async function deleteReceipt(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Get the download URL for a receipt
 * @param path - The full storage path of the receipt
 * @returns The download URL or null if not found
 */
export async function getReceiptUrl(path: string): Promise<string | null> {
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch {
    return null;
  }
}
