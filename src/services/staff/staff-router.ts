import { Router, Request, Response } from "express";

import { strongJwtVerification } from "../../middleware/verify-jwt.js";
import { JwtPayload } from "../auth/auth-models.js";
import { hasStaffPerms } from "../auth/auth-lib.js";

import { AttendanceFormat } from "./staff-formats.js";
import Config from "../../config.js";

import Models from "../../database/models.js";
import { StatusCode } from "status-code-enum";
import { NextFunction } from "express-serve-static-core";
import { RouterError } from "../../middleware/error-handler.js";
import { EventMetadata } from "../../database/event-db.js";
import { StaffShift } from "database/staff-db.js"

const staffRouter: Router = Router();

/**
 * @api {post} /staff/attendance/ POST /staff/attendance/
 * @apiGroup Staff
 * @apiDescription Record staff attendance for an event.
 *
 * @apiHeader {String} Authorization JWT Token with staff permissions.
 *
 * @apiBody {String} eventId The unique identifier of the event.
 *
 * @apiSuccessExample Example Success Response:
 * HTTP/1.1 200 OK
 * {}
 *
 * @apiUse strongVerifyErrors
 * @apiError (403: Forbidden) {String} InvalidPermission Access denied for invalid permission.
 * @apiError (400: Bad Request) {String} InvalidParams Invalid or missing parameters.
 * @apiError (400: Bad Request) {String} EventExpired This particular event has expired.
 * @apiError (404: Not Found) {String} EventNotFound This event was not found
 * @apiErrorExample Example Error Response:
 *     HTTP/1.1 403 Forbidden
 *     {"error": "Forbidden"}
 * @apiErrorExample Example Error Response:
 *     HTTP/1.1 400 Bad Request
 *     {"error": "InvalidParams"}
 * @apiError (500: Internal Error) {String} InternalError Database operation failed.
 * @apiErrorExample Example Error Response:
 *     HTTP/1.1 500 Internal Server Error
 *     {"error": "InternalError"}
 */
staffRouter.post("/attendance/", strongJwtVerification, async (req: Request, res: Response, next: NextFunction) => {
    const payload: JwtPayload | undefined = res.locals.payload as JwtPayload;

    const eventId: string | undefined = (req.body as AttendanceFormat).eventId;
    const userId: string = payload.id;
    // Only staff can mark themselves as attending these events
    if (!hasStaffPerms(payload)) {
        return next(new RouterError(StatusCode.ClientErrorForbidden, "Forbidden"));
    }

    if (!eventId) {
        return next(new RouterError(StatusCode.ClientErrorBadRequest, "InvalidParams"));
    }

    const metadata: EventMetadata | null = await Models.EventMetadata.findOne({ eventId: eventId });

    if (!metadata) {
        return next(new RouterError(StatusCode.ClientErrorNotFound, "EventNotFound"));
    }

    const timestamp: number = Math.round(Date.now() / Config.MILLISECONDS_PER_SECOND);
    console.log(metadata.exp, timestamp);

    if (metadata.exp <= timestamp) {
        return next(new RouterError(StatusCode.ClientErrorBadRequest, "CodeExpired"));
    }

    await Models.UserAttendance.findOneAndUpdate({ userId: userId }, { $addToSet: { attendance: eventId } }, { upsert: true });
    await Models.EventAttendance.findOneAndUpdate({ eventId: eventId }, { $addToSet: { attendees: userId } }, { upsert: true });
    return res.status(StatusCode.SuccessOK).send({ status: "Success" });
});

staffRouter.get("/shift", strongJwtVerification, async(_: Request, res: Response, next: NextFunction) => {
    const payload: JwtPayload | undefined = res.locals.payload as JwtPayload;

    if (!hasStaffPerms(payload)) {
        return next(new RouterError(StatusCode.ClientErrorForbidden, "Forbidden"));
    }

    console.log(payload.id);

    try {
        // const user: AttendeeProfile | null = await Models.AttendeeProfile.findOne({ userId: payload.id });

        // console.log(user);

        const data: StaffShift | null = await Models.StaffShift.findOne({_id: payload.id});
        return res.status(200).json(data);

        // if (!data) {
        //     return next(new RouterError(StatusCode.ClientErrorNotFound, "ShiftNotFound"));
        // }

        // const events: string[] = data.shifts;
        // return res.status(200).json(events);
        
        // const staffEvents: StaffEvent[] = await Models.StaffEvent.find({eventId: {$all: events}});
        // return res.status(200).json(staffEvents);

        
        // return res.status(200).json(user);
    } catch (error) {
        console.error(error);
    }
    

    

    
});

export default staffRouter;
