import { google } from "googleapis";
import stream from "stream";

export function getDriveClient(token: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function findOrCreateFolder(drive: any, name: string, parentId?: string) {
    let q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
    if (parentId) {
        q += ` and '${parentId}' in parents`;
    }
    const res = await drive.files.list({ q, fields: 'files(id, name)' });
    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }
    const fileMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
        fileMetadata.parents = [parentId];
    }
    const createRes = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
    });
    return createRes.data.id;
}

export async function uploadFileToDrive(drive: any, name: string, parentId: string, mimeType: string, buffer: Buffer) {
    // Check if file exists to update or create
    const q = `name='${name}' and '${parentId}' in parents and trashed=false`;
    const res = await drive.files.list({ q, fields: 'files(id)' });
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    
    const media = {
        mimeType,
        body: bufferStream,
    };
    
    if (res.data.files && res.data.files.length > 0) {
        const fileId = res.data.files[0].id;
        await drive.files.update({
            fileId,
            media,
        });
        return fileId;
    } else {
        const fileMetadata = {
            name,
            parents: [parentId],
        };
        const createRes = await drive.files.create({
            requestBody: fileMetadata,
            media,
            fields: 'id',
        });
        return createRes.data.id;
    }
}

export async function getDriveManifest(drive: any, parentId: string) {
    const q = `name='vinyl-collection.json' and '${parentId}' in parents and trashed=false`;
    const res = await drive.files.list({ q, fields: 'files(id)' });
    if (res.data.files && res.data.files.length > 0) {
        const fileId = res.data.files[0].id;
        const file = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'json' });
        return { id: fileId, data: file.data };
    }
    return { id: null, data: [] };
}

export async function saveDriveManifest(drive: any, parentId: string, data: any, existingId: string | null) {
    const buffer = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    
    const media = {
        mimeType: 'application/json',
        body: bufferStream,
    };
    
    if (existingId) {
        await drive.files.update({ fileId: existingId, media });
    } else {
        await drive.files.create({
            requestBody: { name: 'vinyl-collection.json', parents: [parentId] },
            media,
            fields: 'id',
        });
    }
}

export async function deleteDriveFile(drive: any, fileId: string) {
    await drive.files.delete({ fileId });
}
