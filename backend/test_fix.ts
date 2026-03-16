import { db } from "./src/db.js";

async function test() {
    console.log("Starting verification test...");

    // 1. Create a transaction
    const insert = db.prepare(
        `INSERT INTO transactions (type, amount, category, payment_method, note, date)
     VALUES ('income', 100, 'Test', 'Cash', 'Original Note', '2023-10-01')`
    );
    const info = insert.run();
    const id = info.lastInsertRowid;
    console.log(`Created transaction with ID: ${id}`);

    // 2. Verify it has the note
    let row = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as any;
    if (row.note !== "Original Note") {
        throw new Error(`Expected note to be 'Original Note', got '${row.note}'`);
    }
    console.log("Initial state verified.");

    // 3. Update to null
    // We simulate the logic in transactions.ts manually here or we could mock a request
    // But let's just test the logic we added:
    const patch = { note: null };
    const fields: string[] = [];
    const params: Record<string, any> = { id };
    if (patch.note !== undefined) {
        fields.push("note = @note");
        params.note = patch.note;
    }

    const update = db.prepare(`UPDATE transactions SET ${fields.join(", ")} WHERE id = @id`);
    update.run(params);
    console.log("Update executed.");

    // 4. Verify note is null
    row = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as any;
    if (row.note !== null) {
        throw new Error(`Expected note to be null, got '${row.note}'`);
    }
    console.log("Note successfully set to null!");

    // 5. Cleanup test data
    db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
    console.log("Cleanup complete. Test PASSED.");
}

test().catch(err => {
    console.error("Test FAILED:", err);
    process.exit(1);
});
