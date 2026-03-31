import { db } from "./db/index.js";
import bcrypt from "bcryptjs";

async function seed() {
    console.log("🌱 Seeding database...");

    // Clear existing data (in reverse order of dependencies)
    db.prepare("DELETE FROM project_collaborators").run();
    db.prepare("DELETE FROM transactions").run();
    db.prepare("DELETE FROM wallets").run();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM users").run();

    // Create mock users
    const passwordHash = await bcrypt.hash("password123", 10);

    const insertUser = db.prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
    const adminUser = insertUser.run("Admin", "admin@example.com", passwordHash);
    const user1 = insertUser.run("Jane Doe", "jane@example.com", passwordHash);
    const user2 = insertUser.run("John Smith", "john@example.com", passwordHash);

    const adminId = adminUser.lastInsertRowid;
    const user1Id = user1.lastInsertRowid;
    const user2Id = user2.lastInsertRowid;

    console.log("✅ Users created");

    // Create mock wallets for Admin
    const insertWallet = db.prepare("INSERT INTO wallets (user_id, name, is_credit, credit_limit) VALUES (?, ?, ?, ?)");
    insertWallet.run(adminId, "Cash", 0, 0);
    insertWallet.run(adminId, "Bank Account", 0, 0);
    insertWallet.run(adminId, "Credit Card", 1, 5000);

    console.log("✅ Wallets created");

    // Create mock projects for Admin
    const insertProject = db.prepare("INSERT INTO projects (user_id, name, budget_limit) VALUES (?, ?, ?)");
    const project1 = insertProject.run(adminId, "House Renovation", 20000);
    const project2 = insertProject.run(adminId, "Summer Vacation", 5000);
    const project3 = insertProject.run(adminId, "Business Startup", 50000);

    const project1Id = project1.lastInsertRowid;
    const project2Id = project2.lastInsertRowid;
    const project3Id = project3.lastInsertRowid;

    console.log("✅ Projects created");

    // Setup Collaboration
    const insertCollab = db.prepare("INSERT INTO project_collaborators (project_id, user_id, transaction_limit) VALUES (?, ?, ?)");
    insertCollab.run(project1Id, user1Id, 1000);
    insertCollab.run(project3Id, user2Id, 5000);

    console.log("✅ Collaborators added");

    // Create mock transactions
    const insertTransaction = db.prepare(`
        INSERT INTO transactions (user_id, type, amount, category, payment_method, note, date, project_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Some generic transactions
    insertTransaction.run(adminId, 'income', 5000, 'Salary', 'Bank Account', 'Monthly Salary', formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), null, 'approved');
    insertTransaction.run(adminId, 'expense', 150, 'Groceries', 'Cash', 'Weekly shopping', formatDate(new Date(now.getFullYear(), now.getMonth(), 5)), null, 'approved');
    insertTransaction.run(adminId, 'expense', 45, 'Dining', 'Credit Card', 'Lunch with friends', formatDate(new Date(now.getFullYear(), now.getMonth(), 10)), null, 'approved');

    // Project-specific transactions
    insertTransaction.run(adminId, 'expense', 1200, 'Materials', 'Bank Account', 'Lumber for renovation', formatDate(new Date(now.getFullYear(), now.getMonth(), 12)), project1Id, 'approved');
    insertTransaction.run(adminId, 'expense', 800, 'Labor', 'Cash', 'Plumbing work', formatDate(now), project1Id, 'approved');

    insertTransaction.run(adminId, 'expense', 1500, 'Flight', 'Credit Card', 'Tickets to Italy', formatDate(new Date(now.getFullYear(), now.getMonth(), 15)), project2Id, 'approved');

    insertTransaction.run(adminId, 'income', 10000, 'Investment', 'Bank Account', 'Initial startup funding', formatDate(new Date(now.getFullYear(), now.getMonth(), 2)), project3Id, 'approved');
    insertTransaction.run(adminId, 'expense', 2000, 'Legal', 'Bank Account', 'Incorporation fees', formatDate(new Date(now.getFullYear(), now.getMonth(), 18)), project3Id, 'approved');

    // Collaborator transactions (pending approval)
    insertTransaction.run(user1Id, 'expense', 300, 'Supplies', 'Cash', 'Paint and brushes', formatDate(now), project1Id, 'pending');

    console.log("✅ Transactions created");
    console.log("✨ Seeding complete!");
}

seed().catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
