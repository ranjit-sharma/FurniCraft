import * as attendanceService from '../services/attendanceService.js';
import { ROLES } from '../config/constants.js';

export const submit = async (req, res, next) => {
  try {
    const attendance = await attendanceService.submitAttendance({
      data: req.body,
      user: req.user,
      req,
    });
    const updated = Boolean(attendance.$locals?.wasUpdate);
    res.status(updated ? 200 : 201).json({
      status: 'success',
      message: updated ? 'Attendance updated' : 'Attendance submitted successfully',
      data: { attendance, updated },
    });
  } catch (error) {
    next(error);
  }
};

export const approve = async (req, res, next) => {
  try {
    const attendance = await attendanceService.approveAttendance({
      attendanceId: req.params.attendanceId,
      approvedCode: req.body?.code || req.body?.approvedCode,
      dailyWage: req.body?.dailyWage,
      reviewerUser: req.user,
      req,
    });
    res.status(200).json({
      status: 'success',
      message: 'Attendance approved successfully',
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

export const rectify = async (req, res, next) => {
  try {
    const attendance = await attendanceService.rectifyAttendance({
      attendanceId: req.params.attendanceId,
      code: req.body?.code,
      dailyWage: req.body?.dailyWage,
      reason: req.body?.reason,
      reviewerUser: req.user,
      req,
    });
    res.status(200).json({
      status: 'success',
      message: 'Attendance rectified successfully',
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

export const reject = async (req, res, next) => {
  try {
    const attendance = await attendanceService.rejectAttendance({
      attendanceId: req.params.attendanceId,
      reason: req.body.reason,
      reviewerUser: req.user,
      req,
    });
    res.status(200).json({
      status: 'success',
      message: 'Attendance rejected',
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

export const requestCorrection = async (req, res, next) => {
  try {
    const attendance = await attendanceService.requestAttendanceCorrection({
      attendanceId: req.params.attendanceId,
      requestedCode: req.body.requestedCode,
      reason: req.body.reason,
      user: req.user,
      req,
    });
    res.status(200).json({
      status: 'success',
      message: 'Correction request submitted',
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

export const reviewCorrection = async (req, res, next) => {
  try {
    const attendance = await attendanceService.reviewAttendanceCorrection({
      attendanceId: req.params.attendanceId,
      status: req.body.status,
      reviewNotes: req.body.reviewNotes,
      reviewerUser: req.user,
      req,
    });
    res.status(200).json({
      status: 'success',
      message: `Correction request ${req.body.status.toLowerCase()}`,
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

export const bulkApprove = async (req, res, next) => {
  try {
    const result = await attendanceService.bulkApproveAttendance({
      attendanceIds: req.body.attendanceIds,
      reviewerUser: req.user,
      req,
    });
    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyCalendar = async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const workerId = req.query.workerId || (req.user.role === ROLES.WORKER ? req.user._id : undefined);
    const projectId = req.query.projectId;

    const data = await attendanceService.getMonthlyAttendanceCalendar({
      workerId,
      projectId,
      year,
      month,
      user: req.user,
    });

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};
