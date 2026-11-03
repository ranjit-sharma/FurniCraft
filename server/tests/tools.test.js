import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Tool, Project, User } from '../src/models/index.js';
import { signToken } from '../src/utils/jwt.js';

const app = createApp();

describe('Tool Management & Movement History API Tests', () => {
  let thekedarToken, workerToken, workerUser, project, availableTool;

  it('should authenticate actors and setup tool', async () => {
    const resT = await request(app).post('/api/v1/auth/login').send({
      email: 'thekedar.rajesh@furnicraft.com',
      password: 'Thekedar@2026',
    });
    thekedarToken = resT.body.data.token;

    const resW = await request(app).post('/api/v1/auth/login').send({
      email: 'worker.ramesh@furnicraft.com',
      password: 'Worker@2026',
    });
    expect(resW.status).toBe(403);
    expect(resW.body.message).toContain('Worker login is disabled');

    workerUser = await User.findOne({ email: 'worker.ramesh@furnicraft.com' });
    workerToken = signToken({ id: workerUser._id, role: 'WORKER' });

    project = await Project.findOne({ projectCode: 'FURN-2026-001' });

    // Create a new available tool for test
    availableTool = await Tool.create({
      toolCode: `TOOL-TST-${Date.now()}`,
      name: 'Makita Cordless Laminate Trimmer',
      category: 'ROUTER',
      condition: 'NEW',
      status: 'AVAILABLE',
      thekedarId: resT.body.data.user._id,
    });

    expect(availableTool).toBeDefined();
  });

  it('RULE: Issues available tool to project and worker', async () => {
    const res = await request(app)
      .post('/api/v1/tools/issue')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        toolId: availableTool._id.toString(),
        projectId: project._id.toString(),
        workerId: workerUser._id.toString(),
        expectedReturnDate: '2026-11-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.toolIssue.status).toBe('ISSUED');

    const updatedTool = await Tool.findById(availableTool._id);
    expect(updatedTool.status).toBe('ISSUED');
  });

  it('RULE: Prevent duplicate issue of already issued tool', async () => {
    const res = await request(app)
      .post('/api/v1/tools/issue')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        toolId: availableTool._id.toString(),
        projectId: project._id.toString(),
        workerId: workerUser._id.toString(),
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('is currently not available');
  });

  it('RULE: Thekedar isolation - Thekedar A cannot see or issue Thekedar B tools', async () => {
    let thekedarB = await User.findOne({ email: 'thekedar.vikram@furnicraft.com' });
    if (!thekedarB) {
      thekedarB = await User.create({
        name: 'Vikram Thekedar',
        email: 'thekedar.vikram@furnicraft.com',
        phone: '+91 99887 77889',
        password: 'Thekedar@2026',
        role: 'THEKEDAR',
        status: 'ACTIVE',
      });
    }

    const { signToken } = await import('../src/utils/jwt.js');
    const tokenB = signToken({
      id: thekedarB._id,
      role: thekedarB.role,
      tokenVersion: thekedarB.tokenVersion || 0,
    });

    // Thekedar B lists tools - must NOT see Rajesh's tool
    const listRes = await request(app)
      .get('/api/v1/tools')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(listRes.status).toBe(200);
    const hasRajeshTool = listRes.body.data.tools.some((t) => t._id.toString() === availableTool._id.toString());
    expect(hasRajeshTool).toBe(false);

    // Thekedar B attempts to issue Rajesh's tool - rejected
    const issueRes = await request(app)
      .post('/api/v1/tools/issue')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        toolId: availableTool._id.toString(),
        projectId: project._id.toString(),
        workerId: workerUser._id.toString(),
      });

    expect([403, 409]).toContain(issueRes.status);
  });

  it('RULE: Thekedar can shift a worker to another project and delete/unassign the assignment', async () => {
    const { ProjectAssignment } = await import('../src/models/index.js');
    const project2 = await Project.findOne({ projectCode: 'FURN-2026-002' });

    let testWorker = await User.findOne({ email: 'test.shiftcraftsman@furnicraft.com' });
    if (!testWorker) {
      testWorker = await User.create({
        name: 'Test Shift Craftsman',
        email: 'test.shiftcraftsman@furnicraft.com',
        phone: '+91 99881 12233',
        password: 'Worker@2026',
        role: 'WORKER',
        status: 'ACTIVE',
      });
    }

    // 1. Create active assignment for test worker on project 1
    const assignment = await ProjectAssignment.create({
      workerId: testWorker._id,
      projectId: project._id,
      thekedarId: project.thekedarId,
      assignedBy: project.thekedarId,
      roleInProject: 'Assembly Craftsman',
      status: 'ACTIVE',
    });

    // 2. Shift worker from project 1 to project 2
    const shiftRes = await request(app)
      .post(`/api/v1/projects/assignments/${assignment._id}/shift`)
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        toProjectId: project2._id.toString(),
        roleInProject: 'Sliding Track Specialist',
        wageOverride: 900,
        notes: 'Shifted for urgent project handover',
      });
    expect(shiftRes.status).toBe(200);
    expect(shiftRes.body.data.previousAssignment.status).toBe('TRANSFERRED');
    expect(shiftRes.body.data.newAssignment.projectId.toString()).toBe(project2._id.toString());

    // 3. Remove / delete the assignment
    const deleteRes = await request(app)
      .delete(`/api/v1/projects/assignments/${shiftRes.body.data.newAssignment._id}`)
      .set('Authorization', `Bearer ${thekedarToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toContain('removed from project assignment');

    // Clean up
    await ProjectAssignment.deleteMany({ workerId: testWorker._id });
  });
});
