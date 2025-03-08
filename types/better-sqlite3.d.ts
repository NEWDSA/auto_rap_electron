declare module 'better-sqlite3' {
    interface Database {
        prepare(sql: string): Statement;
        exec(sql: string): void;
    }

    interface Statement {
        run(...params: any[]): { lastInsertRowid: number };
        get(...params: any[]): any;
        all(...params: any[]): any[];
    }

    interface DatabaseConstructor {
        new (path: string): Database;
        (path: string): Database;
    }

    const Database: DatabaseConstructor;
    export default Database;
} 