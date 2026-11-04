import { Router } from 'express';
import { requireAuthentication } from '../middleware/authMiddleware.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

// Public VAPID public key endpoint
router.get('/vapid-public-key', notificationController.getVapidPublicKey);

// Authenticated notification management
router.use(requireAuthentication);

router.post('/push-subscription', notificationController.subscribePush);
router.delete('/push-subscription', notificationController.unsubscribePush);
router.get('/alarm-settings', notificationController.getAlarmSettings);
router.patch('/alarm-settings', notificationController.updateAlarmSettings);
router.post('/test-push', notificationController.testPushNotification);

export default router;
