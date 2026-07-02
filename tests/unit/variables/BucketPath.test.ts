/**
 * Unit tests for bucket path utility functions.
 *
 * These cover the pure utility functions in src/utils/bucketPath.ts as well as
 * the {topfolder}, {secondfolder}, {bucketpath}, {bucketpath:n}, and {folder:n}
 * variables surfaced through VariableProcessor.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getNoteFolderSegments, resolveBucketPath } from '../../../src/utils/bucketPath';
import { VariableProcessor } from '../../../src/VariableProcessor';
import { DEFAULT_SETTINGS } from '../../../src/ImageConverterSettings';
import { fakeApp, fakeVault, fakeTFile, fakeTFolder } from '../../factories/obsidian';

// ---------------------------------------------------------------------------
// 1. Pure utility: getNoteFolderSegments
// ---------------------------------------------------------------------------

describe('getNoteFolderSegments', () => {
    it('returns all folder segments for a deep path', () => {
        expect(getNoteFolderSegments('IT Pro/Content Creation/Content Items/Ideas/Note.md'))
            .toEqual(['IT Pro', 'Content Creation', 'Content Items', 'Ideas']);
    });

    it('returns two segments for a two-level path', () => {
        expect(getNoteFolderSegments('Hobbies/3DPrinting/Note.md'))
            .toEqual(['Hobbies', '3DPrinting']);
    });

    it('returns single segment for one-level path', () => {
        expect(getNoteFolderSegments('SingleFolder/Note.md'))
            .toEqual(['SingleFolder']);
    });

    it('returns empty array for root-level note', () => {
        expect(getNoteFolderSegments('Root Note.md')).toEqual([]);
    });

    it('handles backslash separators', () => {
        expect(getNoteFolderSegments('A\\B\\C\\Note.md')).toEqual(['A', 'B', 'C']);
    });
});

// ---------------------------------------------------------------------------
// 2. Pure utility: resolveBucketPath
// ---------------------------------------------------------------------------

describe('resolveBucketPath', () => {
    it('depth 2 – deep path returns first two segments', () => {
        expect(resolveBucketPath('IT Pro/Content Creation/Content Items/Ideas/Note.md', 2, 'Inbox'))
            .toBe('IT Pro/Content Creation');
    });

    it('depth 2 – two-level path returns both segments', () => {
        expect(resolveBucketPath('Hobbies/3DPrinting/Note.md', 2, 'Inbox'))
            .toBe('Hobbies/3DPrinting');
    });

    it('depth 2 – one-level path returns the single available segment', () => {
        expect(resolveBucketPath('SingleFolder/Note.md', 2, 'Inbox'))
            .toBe('SingleFolder');
    });

    it('root note returns fallback', () => {
        expect(resolveBucketPath('Root Note.md', 2, 'Inbox')).toBe('Inbox');
    });

    it('depth 1 returns only the top folder', () => {
        expect(resolveBucketPath('IT Pro/Content/Note.md', 1, 'Inbox'))
            .toBe('IT Pro');
    });

    it('depth 3 on four-level path returns three segments', () => {
        expect(resolveBucketPath('IT Pro/Content Creation/Content Items/Ideas/Note.md', 3, 'Inbox'))
            .toBe('IT Pro/Content Creation/Content Items');
    });

    it('depth larger than available segments clamps to available', () => {
        expect(resolveBucketPath('Life/House/Note.md', 5, 'Inbox'))
            .toBe('Life/House');
    });

    it('custom fallback is used for root note', () => {
        expect(resolveBucketPath('RootNote.md', 2, 'General')).toBe('General');
    });
});

// ---------------------------------------------------------------------------
// 3. VariableProcessor integration: bucket path variables
// ---------------------------------------------------------------------------

/** Build a realistic TFile with a nested parent chain matching the given path. */
function makeActiveFile(notePath: string): any {
    const parts = notePath.split('/');
    const name = parts[parts.length - 1];
    const basename = name.replace(/\.[^.]+$/, '');
    const folderParts = parts.slice(0, -1);

    // Build a parent chain from the innermost folder outwards
    let parent: any = null;
    for (let i = 0; i < folderParts.length; i++) {
        const segPath = folderParts.slice(0, i + 1).join('/');
        const seg = folderParts[i];
        const folder = new (fakeTFolder as any)({ path: segPath, name: seg, parent, children: [] });
        parent = folder;
    }

    return fakeTFile({ path: notePath, name, basename, parent });
}

describe('VariableProcessor bucket path variables', () => {
    let app: any;
    let processor: VariableProcessor;
    const dummyFile = new File([new Uint8Array([1])], 'x.png', { type: 'image/png' });

    beforeEach(() => {
        const vault = fakeVault({ attachmentFolderPath: 'attachments' });
        app = fakeApp({ vault }) as any;
        // Suppress metadata cache calls
        app.metadataCache = { getFileCache: vi.fn(() => null) };
        const settings = {
            ...DEFAULT_SETTINGS,
            rootNoteFallbackBucket: 'Inbox',
            useFrontmatterAttachmentPrefix: false,
        };
        processor = new VariableProcessor(app, settings as any);
    });

    // {topfolder}
    it('{topfolder} = first folder segment', async () => {
        const active = makeActiveFile('IT Pro/Content Creation/Ideas/Note.md');
        const out = await processor.processTemplate('{topfolder}', { file: dummyFile, activeFile: active });
        expect(out).toBe('IT Pro');
    });

    it('{topfolder} is empty for vault-root note', async () => {
        const active = makeActiveFile('RootNote.md');
        const out = await processor.processTemplate('{topfolder}', { file: dummyFile, activeFile: active });
        expect(out).toBe('');
    });

    // {secondfolder}
    it('{secondfolder} = second folder segment', async () => {
        const active = makeActiveFile('IT Pro/Content Creation/Ideas/Note.md');
        const out = await processor.processTemplate('{secondfolder}', { file: dummyFile, activeFile: active });
        expect(out).toBe('Content Creation');
    });

    it('{secondfolder} is empty when note is one level deep', async () => {
        const active = makeActiveFile('SingleFolder/Note.md');
        const out = await processor.processTemplate('{secondfolder}', { file: dummyFile, activeFile: active });
        expect(out).toBe('');
    });

    // {bucketpath} (= {bucketpath:2})
    it('{bucketpath} returns top two folders for deep note', async () => {
        const active = makeActiveFile('IT Pro/Content Creation/Content Items/Ideas/Note.md');
        const out = await processor.processTemplate('{bucketpath}', { file: dummyFile, activeFile: active });
        expect(out).toBe('IT Pro/Content Creation');
    });

    it('{bucketpath} returns single folder when note is one level deep', async () => {
        const active = makeActiveFile('SingleFolder/Note.md');
        const out = await processor.processTemplate('{bucketpath}', { file: dummyFile, activeFile: active });
        expect(out).toBe('SingleFolder');
    });

    it('{bucketpath} returns fallback for root note', async () => {
        const active = makeActiveFile('RootNote.md');
        const out = await processor.processTemplate('{bucketpath}', { file: dummyFile, activeFile: active });
        expect(out).toBe('Inbox');
    });

    // {bucketpath:n}
    it('{bucketpath:1} = top folder only', async () => {
        const active = makeActiveFile('IT Pro/Content Creation/Ideas/Note.md');
        const out = await processor.processTemplate('{bucketpath:1}', { file: dummyFile, activeFile: active });
        expect(out).toBe('IT Pro');
    });

    it('{bucketpath:2} matches acceptance-check case for Hobbies/3DPrinting', async () => {
        const active = makeActiveFile('Hobbies/3DPrinting/Note.md');
        const out = await processor.processTemplate('{bucketpath:2}', { file: dummyFile, activeFile: active });
        expect(out).toBe('Hobbies/3DPrinting');
    });

    it('{bucketpath:2} for IT Pro/Content Creation/Content Items/Ideas = IT Pro/Content Creation', async () => {
        const active = makeActiveFile('IT Pro/Content Creation/Content Items/Ideas/Note.md');
        const out = await processor.processTemplate('{bucketpath:2}', { file: dummyFile, activeFile: active });
        expect(out).toBe('IT Pro/Content Creation');
    });

    it('{bucketpath:2} for Life/House = Life/House', async () => {
        const active = makeActiveFile('Life/House/Note.md');
        const out = await processor.processTemplate('{bucketpath:2}', { file: dummyFile, activeFile: active });
        expect(out).toBe('Life/House');
    });

    it('{bucketpath:2} for SingleFolder = SingleFolder (clamps to available segments)', async () => {
        const active = makeActiveFile('SingleFolder/Note.md');
        const out = await processor.processTemplate('{bucketpath:2}', { file: dummyFile, activeFile: active });
        expect(out).toBe('SingleFolder');
    });

    it('{bucketpath:2} for RootNote = Inbox (fallback)', async () => {
        const active = makeActiveFile('Root Note.md');
        const out = await processor.processTemplate('{bucketpath:2}', { file: dummyFile, activeFile: active });
        expect(out).toBe('Inbox');
    });

    it('{bucketpath:3} returns three segments when available', async () => {
        const active = makeActiveFile('IT Pro/Content Creation/Content Items/Ideas/Note.md');
        const out = await processor.processTemplate('{bucketpath:3}', { file: dummyFile, activeFile: active });
        expect(out).toBe('IT Pro/Content Creation/Content Items');
    });

    // {folder:n}
    it('{folder:0} = top folder', async () => {
        const active = makeActiveFile('IT Pro/Content Creation/Ideas/Note.md');
        const out = await processor.processTemplate('{folder:0}', { file: dummyFile, activeFile: active });
        expect(out).toBe('IT Pro');
    });

    it('{folder:1} = second folder', async () => {
        const active = makeActiveFile('IT Pro/Content Creation/Ideas/Note.md');
        const out = await processor.processTemplate('{folder:1}', { file: dummyFile, activeFile: active });
        expect(out).toBe('Content Creation');
    });

    it('{folder:2} = third folder', async () => {
        const active = makeActiveFile('IT Pro/Content Creation/Content Items/Ideas/Note.md');
        const out = await processor.processTemplate('{folder:2}', { file: dummyFile, activeFile: active });
        expect(out).toBe('Content Items');
    });

    it('{folder:n} is empty when index is out of range', async () => {
        const active = makeActiveFile('SingleFolder/Note.md');
        const out = await processor.processTemplate('{folder:5}', { file: dummyFile, activeFile: active });
        expect(out).toBe('');
    });

    // {attachmentprefix}
    it('{attachmentprefix} defaults to note basename', async () => {
        const active = makeActiveFile('Notes/My Note.md');
        const out = await processor.processTemplate('{attachmentprefix}', { file: dummyFile, activeFile: active });
        expect(out).toBe('My Note');
    });

    it('{attachmentprefix} uses frontmatter attachment_prefix when present and enabled', async () => {
        const active = makeActiveFile('Notes/My Note.md');
        // Enable frontmatter prefix and mock the cache
        const settings = {
            ...DEFAULT_SETTINGS,
            useFrontmatterAttachmentPrefix: true,
            rootNoteFallbackBucket: 'Inbox',
        };
        const vp = new VariableProcessor(app, settings as any);
        app.metadataCache = {
            getFileCache: vi.fn(() => ({
                frontmatter: { attachment_prefix: 'MVP Summit 2026' }
            }))
        };
        const out = await vp.processTemplate('{attachmentprefix}', { file: dummyFile, activeFile: active });
        expect(out).toBe('MVP Summit 2026');
    });

    // Folder template integration test
    it('folder template _attachments/{bucketpath:2}/ resolves correctly', async () => {
        const active = makeActiveFile('IT Pro/Content Creation/Content Items/Ideas/Test.md');
        const out = await processor.processTemplate('_attachments/{bucketpath:2}/', { file: dummyFile, activeFile: active });
        expect(out).toBe('_attachments/IT Pro/Content Creation/');
    });
});
