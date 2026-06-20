/**
 * Fetch a file from a URL and return it as a Buffer
 */
export async function fetchFileBuffer(url: string, errorMessage = "Failed to download file from URL."): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(errorMessage);
    }
    return Buffer.from(await response.arrayBuffer());
}
