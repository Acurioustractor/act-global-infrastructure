import { Client } from '@notionhq/client';
export declare const notion: Client;
export declare const databaseId: string;
export declare function extractPageId(urlOrId: string): string;
export declare function getTask(urlOrId: string): Promise<import("@notionhq/client/build/src/api-endpoints.js").GetPageResponse>;
export declare function updateTask(urlOrId: string, properties: Record<string, any>): Promise<import("@notionhq/client/build/src/api-endpoints.js").UpdatePageResponse>;
export declare function getComments(urlOrId: string): Promise<import("@notionhq/client/build/src/api-endpoints.js").ListCommentsResponse>;
export declare function addComment(urlOrId: string, text: string): Promise<import("@notionhq/client/build/src/api-endpoints.js").CreateCommentResponse>;
export declare function createTask(options: {
    name: string;
    project?: string;
    priority?: string;
    currentStatus?: string;
}): Promise<import("@notionhq/client/build/src/api-endpoints.js").CreatePageResponse>;
