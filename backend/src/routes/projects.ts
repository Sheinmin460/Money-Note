import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware.js";
import { projectService } from "../services/projectService.js";
import { userService } from "../services/userService.js";
import bcrypt from "bcryptjs";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const projectCreateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    budget_limit: z.number().min(0).default(0)
});

const inviteCollaboratorSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
    transaction_limit: z.number().min(0).default(0)
});

projectsRouter.get("/comparison", (req, res) => {
    try {
        const userId = req.user!.id;
        const result = projectService.getProjectComparison(userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to get project comparison" });
    }
});

projectsRouter.get("/", (req, res) => {
    try {
        const userId = req.user!.id;
        const rows = projectService.listProjects(userId);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Failed to list projects" });
    }
});

projectsRouter.post("/", (req, res) => {
    try {
        const userId = req.user!.id;
        const parsed = projectCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
        }

        const { name, budget_limit } = parsed.data;
        const created = projectService.createProject(userId, name, budget_limit);
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ error: "Failed to create project" });
    }
});

projectsRouter.delete("/:id", (req, res) => {
    try {
        const userId = req.user!.id;
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

        const info = projectService.deleteProject(id, userId);
        if (info.changes === 0) return res.status(404).json({ error: "Not found" });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Failed to delete project" });
    }
});

projectsRouter.get("/:id", (req, res) => {
    try {
        const userId = req.user!.id;
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

        const details = projectService.getProjectDetails(userId, id);
        if (!details) return res.status(404).json({ error: "Project not found or access denied" });

        res.json(details);
    } catch (error) {
        res.status(500).json({ error: "Failed to get project details" });
    }
});

// Invite collaborator
projectsRouter.post("/:id/collaborators", async (req, res) => {
    try {
        const userId = req.user!.id;
        const projectId = Number(req.params.id);
        const parsed = inviteCollaboratorSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

        const { email, password, transaction_limit } = parsed.data;

        // 1. Verify project ownership
        const project = projectService.getProjectWithAccess(userId, projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });
        if (project.user_id !== userId) return res.status(403).json({ error: "Only the owner can invite collaborators" });

        // 2. Verify owner password
        const owner = userService.getUserById(userId);
        if (!owner) return res.status(404).json({ error: "User not found" });
        const match = await bcrypt.compare(password, owner.password_hash);
        if (!match) return res.status(401).json({ error: "Incorrect password confirmation" });

        // 3. Find user by email
        const targetUser = userService.getUserByEmail(email);
        if (!targetUser) return res.status(404).json({ error: "User with this email not found" });
        if (targetUser.id === userId) return res.status(400).json({ error: "You cannot invite yourself" });

        // 4. Check if already collaborator
        const details = projectService.getProjectDetails(userId, projectId);
        if (details?.collaborators.some(c => c.id === targetUser.id)) {
            return res.status(400).json({ error: "User is already a collaborator" });
        }

        // 5. Add collaborator
        projectService.addCollaborator(projectId, targetUser.id, transaction_limit);

        res.status(201).json({ message: "Collaborator invited successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to invite collaborator" });
    }
});

// Update project settings
projectsRouter.patch("/:id", (req, res) => {
    try {
        const userId = req.user!.id;
        const id = Number(req.params.id);
        const parsed = projectCreateSchema.partial().safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

        projectService.updateProject(id, userId, parsed.data);
        res.json({ message: "Settings updated" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update project" });
    }
});

// Update collaborator limit
projectsRouter.patch("/:id/collaborators/:targetUserId", (req, res) => {
    try {
        const userId = req.user!.id;
        const projectId = Number(req.params.id);
        const targetUserId = Number(req.params.targetUserId);
        const schema = z.object({ transaction_limit: z.number().min(0) });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

        const project = projectService.getProjectWithAccess(userId, projectId);
        if (!project || project.user_id !== userId) {
            return res.status(403).json({ error: "Only the owner can update collaborator limits" });
        }

        projectService.updateCollaboratorLimit(projectId, targetUserId, parsed.data.transaction_limit);
        res.json({ message: "Limit updated" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update collaborator limit" });
    }
});

// Remove collaborator
projectsRouter.delete("/:id/collaborators/:targetUserId", (req, res) => {
    try {
        const userId = req.user!.id;
        const projectId = Number(req.params.id);
        const targetUserId = Number(req.params.targetUserId);

        const project = projectService.getProjectWithAccess(userId, projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Only owner can remove collaborators, OR collaborator can remove themselves
        if (project.user_id !== userId && userId !== targetUserId) {
            return res.status(403).json({ error: "Permission denied" });
        }

        projectService.removeCollaborator(projectId, targetUserId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Failed to remove collaborator" });
    }
});
