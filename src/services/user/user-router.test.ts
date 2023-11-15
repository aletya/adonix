import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import {
    AUTH_ROLE_TO_ROLES,
    TESTER,
    get,
    getAsAdmin,
    getAsAttendee,
    getAsStaff,
    putAsAdmin,
    putAsAttendee,
    putAsStaff,
} from "../../testTools.js";
import Models from "../../database/models.js";
import { UserInfo } from "../../database/user-db.js";
import { AuthInfo } from "../../database/auth-db.js";
import * as authLib from "../auth/auth-lib.js";
import { Role } from "../auth/auth-models.js";
import Config from "../../config.js";
import { SpiedFunction } from "jest-mock";
import { StatusCode } from "status-code-enum";
import { EventFollowing } from "database/event-db.js";
import { AttendeeFollowing } from "database/attendee-db.js";

const TESTER_USER = {
    userId: TESTER.id,
    name: TESTER.name,
    email: TESTER.email,
} satisfies UserInfo;

const OTHER_USER = {
    userId: "other-user",
    email: `other-user@hackillinois.org`,
    name: "Other User",
} satisfies UserInfo;

const OTHER_USER_AUTH = {
    userId: OTHER_USER.userId,
    provider: "github",
    roles: AUTH_ROLE_TO_ROLES[Role.ATTENDEE],
} satisfies AuthInfo;

const TESTER_EVENT_FOLLOWING = {
    eventId: "other-event",
    followers: ["user5", "user8"],
} satisfies EventFollowing;

const TESTER_ATTENDEE_FOLLOWING = {
    userId: TESTER.id,
    events: ["event3", "event9"],
} satisfies AttendeeFollowing;

// Before each test, initialize database with tester & other users
beforeEach(async () => {
    Models.initialize();
    await Models.UserInfo.create(TESTER_USER);
    await Models.UserInfo.create(OTHER_USER);
    await Models.AuthInfo.create(OTHER_USER_AUTH);
    await Models.EventFollowing.create(TESTER_EVENT_FOLLOWING);
    await Models.AttendeeFollowing.create(TESTER_ATTENDEE_FOLLOWING);
});

/*
 * Mocks generateJwtToken with a wrapper so calls and returns can be examined. Does not change behavior.
 */
function mockGenerateJwtTokenWithWrapper(): SpiedFunction<typeof authLib.generateJwtToken> {
    const mockedAuthLib = require("../auth/auth-lib.js") as typeof authLib;
    const mockedGenerateJwtToken = jest.spyOn(mockedAuthLib, "generateJwtToken");
    mockedGenerateJwtToken.mockImplementation((payload, shouldNotExpire, expiration) => {
        return authLib.generateJwtToken(payload, shouldNotExpire, expiration);
    });
    return mockedGenerateJwtToken;
}

describe("GET /user/qr/", () => {
    it("works for a attendee", async () => {
        const mockedGenerateJwtToken = mockGenerateJwtTokenWithWrapper();

        const response = await getAsAttendee("/user/qr/").expect(StatusCode.SuccessOK);

        const jwtReturned = mockedGenerateJwtToken.mock.results[mockedGenerateJwtToken.mock.results.length - 1]!.value;

        expect(JSON.parse(response.text)).toMatchObject({
            userId: TESTER_USER.userId,
            qrInfo: `hackillinois://user?userToken=${jwtReturned}`,
        });

        expect(mockedGenerateJwtToken).toBeCalledWith(
            expect.objectContaining({
                id: TESTER_USER.userId,
            }),
            false,
            Config.QR_EXPIRY_TIME,
        );
    });
});

describe("GET /user/qr/:USERID/", () => {
    it("gives a forbidden error for a non-staff user", async () => {
        const response = await getAsAttendee(`/user/qr/${OTHER_USER.userId}/`).expect(StatusCode.ClientErrorForbidden);

        expect(JSON.parse(response.text)).toHaveProperty("error", "Forbidden");
    });

    it("works for a non-staff user requesting their qr code", async () => {
        const mockedGenerateJwtToken = mockGenerateJwtTokenWithWrapper();

        const response = await getAsAttendee(`/user/qr/${TESTER_USER.userId}/`).expect(StatusCode.SuccessOK);

        const jwtReturned = mockedGenerateJwtToken.mock.results[mockedGenerateJwtToken.mock.results.length - 1]!.value;

        expect(JSON.parse(response.text)).toMatchObject({
            userId: TESTER_USER.userId,
            qrInfo: `hackillinois://user?userToken=${jwtReturned}`,
        });

        expect(mockedGenerateJwtToken).toBeCalledWith(
            expect.objectContaining({
                id: TESTER_USER.userId,
            }),
            false,
            Config.QR_EXPIRY_TIME,
        );
    });

    it("works for a staff user", async () => {
        const mockedGenerateJwtToken = mockGenerateJwtTokenWithWrapper();

        const response = await getAsStaff(`/user/qr/${OTHER_USER.userId}/`).expect(StatusCode.SuccessOK);

        const jwtReturned = mockedGenerateJwtToken.mock.results[mockedGenerateJwtToken.mock.results.length - 1]!.value;

        expect(JSON.parse(response.text)).toMatchObject({
            userId: OTHER_USER.userId,
            qrInfo: `hackillinois://user?userToken=${jwtReturned}`,
        });

        expect(mockedGenerateJwtToken).toBeCalledWith(
            expect.objectContaining({
                id: OTHER_USER.userId,
            }),
            false,
            Config.QR_EXPIRY_TIME,
        );
    });
});

describe("GET /user/", () => {
    it("gives an unauthorized error for an unauthenticated user", async () => {
        const response = await get("/user/").expect(StatusCode.ClientErrorUnauthorized);

        expect(JSON.parse(response.text)).toHaveProperty("error", "NoToken");
    });

    it("gives an not found error for an non-existent user", async () => {
        await Models.UserInfo.deleteOne({
            userId: TESTER_USER.userId,
        });

        const response = await getAsAttendee("/user/").expect(StatusCode.ClientErrorNotFound);

        expect(JSON.parse(response.text)).toHaveProperty("error", "UserNotFound");
    });

    it("works for an attendee user", async () => {
        const response = await getAsAttendee("/user/").expect(StatusCode.SuccessOK);

        expect(JSON.parse(response.text)).toMatchObject(TESTER_USER);
    });

    it("works for an staff user", async () => {
        const response = await getAsStaff("/user/").expect(StatusCode.SuccessOK);

        expect(JSON.parse(response.text)).toMatchObject(TESTER_USER);
    });

    it("works for an admin user", async () => {
        const response = await getAsAdmin("/user/").expect(StatusCode.SuccessOK);

        expect(JSON.parse(response.text)).toMatchObject(TESTER_USER);
    });
});

describe("GET /user/:USERID/", () => {
    it("gives an forbidden error for a non-staff user", async () => {
        const response = await getAsAttendee(`/user/${OTHER_USER.userId}/`).expect(StatusCode.ClientErrorForbidden);

        expect(JSON.parse(response.text)).toHaveProperty("error", "Forbidden");
    });

    it("gives an not found error for a non-existent user", async () => {
        await Models.UserInfo.deleteOne({
            userId: OTHER_USER.userId,
        });

        const response = await getAsStaff(`/user/${OTHER_USER.userId}/`).expect(StatusCode.ClientErrorNotFound);

        expect(JSON.parse(response.text)).toHaveProperty("error", "UserNotFound");
    });

    it("works for a non-staff user requesting themselves", async () => {
        const response = await getAsAttendee(`/user/${TESTER_USER.userId}/`).expect(StatusCode.SuccessOK);

        expect(JSON.parse(response.text)).toMatchObject(TESTER_USER);
    });

    it("works for a staff user", async () => {
        const response = await getAsStaff(`/user/${OTHER_USER.userId}/`).expect(StatusCode.SuccessOK);

        expect(JSON.parse(response.text)).toMatchObject(OTHER_USER);
    });
});

describe("GET /user/following/:USERID", () => {
    it("gives an forbidden error for a non-staff user", async () => {
        const response = await getAsAttendee(`/user/following/${TESTER_ATTENDEE_FOLLOWING.userId}/`).expect(
            StatusCode.ClientErrorForbidden,
        );

        expect(JSON.parse(response.text)).toHaveProperty("error", "Forbidden");
    });

    it("gives an not found error for a non-existent user", async () => {
        await Models.AttendeeFollowing.deleteOne({
            userId: TESTER_ATTENDEE_FOLLOWING.userId,
        });

        const response = await getAsStaff(`/user/following/${TESTER_ATTENDEE_FOLLOWING.userId}/`).expect(
            StatusCode.ClientErrorNotFound,
        );

        expect(JSON.parse(response.text)).toHaveProperty("error", "UserNotFound");
    });

    it("works for a staff user", async () => {
        const response = await getAsStaff(`/user/following/${TESTER_ATTENDEE_FOLLOWING.userId}/`).expect(StatusCode.SuccessOK);

        expect(JSON.parse(response.text)).toEqual(TESTER_ATTENDEE_FOLLOWING.events);
    });
});

describe("PUT /user/follow/:EVENTID", () => {
    it("gives an not found error for a non-existent user", async () => {
        await Models.AttendeeFollowing.deleteOne({
            userId: TESTER_ATTENDEE_FOLLOWING.userId,
        });

        const response = await putAsAttendee(`/user/follow/${TESTER_EVENT_FOLLOWING.eventId}/`).expect(
            StatusCode.ClientErrorNotFound,
        );

        expect(JSON.parse(response.text)).toHaveProperty("error", "UserNotFound");
    });

    it("gives an not found error for a non-existent event", async () => {
        await Models.EventFollowing.deleteOne({
            eventId: TESTER_EVENT_FOLLOWING.eventId,
        });

        const response = await putAsAttendee(`/user/follow/${TESTER_EVENT_FOLLOWING.eventId}/`).expect(
            StatusCode.ClientErrorNotFound,
        );

        expect(JSON.parse(response.text)).toHaveProperty("error", "EventNotFound");
    });

    it("works for an attendee user", async () => {
        const response = await putAsAttendee(`/user/follow/${TESTER_EVENT_FOLLOWING.eventId}/`).expect(StatusCode.SuccessOK);
        expect(JSON.parse(response.text)).toHaveProperty("message", "StatusSuccess");
        const updatedEvents = await Models.AttendeeFollowing.findOne({ userId: TESTER_ATTENDEE_FOLLOWING.userId });
        const updatedUsers = await Models.EventFollowing.findOne({ eventId: TESTER_EVENT_FOLLOWING.eventId });
        expect(updatedUsers?.followers).toContain(TESTER_ATTENDEE_FOLLOWING.userId);
        expect(updatedEvents?.events).toContain(TESTER_EVENT_FOLLOWING.eventId);
    });

    it("works for an staff user", async () => {
        const response = await putAsStaff(`/user/follow/${TESTER_EVENT_FOLLOWING.eventId}/`).expect(StatusCode.SuccessOK);
        expect(JSON.parse(response.text)).toHaveProperty("message", "StatusSuccess");
        const updatedEvents = await Models.AttendeeFollowing.findOne({ userId: TESTER_ATTENDEE_FOLLOWING.userId });
        const updatedUsers = await Models.EventFollowing.findOne({ eventId: TESTER_EVENT_FOLLOWING.eventId });
        expect(updatedUsers?.followers).toContain(TESTER_ATTENDEE_FOLLOWING.userId);
        expect(updatedEvents?.events).toContain(TESTER_EVENT_FOLLOWING.eventId);
    });

    it("works for an admin user", async () => {
        const response = await putAsAdmin(`/user/follow/${TESTER_EVENT_FOLLOWING.eventId}/`).expect(StatusCode.SuccessOK);
        expect(JSON.parse(response.text)).toHaveProperty("message", "StatusSuccess");
        const updatedEvents = await Models.AttendeeFollowing.findOne({ userId: TESTER_ATTENDEE_FOLLOWING.userId });
        const updatedUsers = await Models.EventFollowing.findOne({ eventId: TESTER_EVENT_FOLLOWING.eventId });
        expect(updatedUsers?.followers).toContain(TESTER_ATTENDEE_FOLLOWING.userId);
        expect(updatedEvents?.events).toContain(TESTER_EVENT_FOLLOWING.eventId);
    });
});

describe("PUT /user/unfollow/:EVENTID", () => {
    it("gives an not found error for a non-existent user", async () => {
        await Models.AttendeeFollowing.deleteOne({
            userId: TESTER_ATTENDEE_FOLLOWING.userId,
        });

        const response = await putAsAttendee(`/user/unfollow/${TESTER_EVENT_FOLLOWING.eventId}/`).expect(
            StatusCode.ClientErrorNotFound,
        );

        expect(JSON.parse(response.text)).toHaveProperty("error", "UserNotFound");
    });

    it("gives an not found error for a non-existent event", async () => {
        await Models.EventFollowing.deleteOne({
            eventId: TESTER_EVENT_FOLLOWING.eventId,
        });

        const response = await putAsAttendee(`/user/unfollow/${TESTER_EVENT_FOLLOWING.eventId}/`).expect(
            StatusCode.ClientErrorNotFound,
        );

        expect(JSON.parse(response.text)).toHaveProperty("error", "EventNotFound");
    });

    it("works for an attendee user", async () => {
        await Models.EventFollowing.findOneAndUpdate(
            { eventId: TESTER_EVENT_FOLLOWING.eventId },
            { $addToSet: { followers: TESTER_ATTENDEE_FOLLOWING.userId } },
            { new: true },
        );
        await Models.AttendeeFollowing.findOneAndUpdate(
            { userId: TESTER_ATTENDEE_FOLLOWING.userId },
            { $addToSet: { events: TESTER_EVENT_FOLLOWING.eventId } },
            { new: true },
        );
        const response = await putAsAttendee(`/user/unfollow/${TESTER_EVENT_FOLLOWING.eventId}/`).expect(StatusCode.SuccessOK);
        expect(JSON.parse(response.text)).toHaveProperty("message", "StatusSuccess");
        const updatedEvents = await Models.AttendeeFollowing.findOne({ userId: TESTER_ATTENDEE_FOLLOWING.userId });
        const updatedUsers = await Models.EventFollowing.findOne({ eventId: TESTER_EVENT_FOLLOWING.eventId });
        expect(updatedUsers).toEqual(expect.not.arrayContaining([TESTER_ATTENDEE_FOLLOWING.userId]));
        expect(updatedEvents).toEqual(expect.not.arrayContaining([TESTER_EVENT_FOLLOWING.eventId]));
    });

    it("works for an staff user", async () => {
        await Models.EventFollowing.findOneAndUpdate(
            { eventId: TESTER_EVENT_FOLLOWING.eventId },
            { $addToSet: { followers: TESTER_ATTENDEE_FOLLOWING.userId } },
            { new: true },
        );
        await Models.AttendeeFollowing.findOneAndUpdate(
            { userId: TESTER_ATTENDEE_FOLLOWING.userId },
            { $addToSet: { events: TESTER_EVENT_FOLLOWING.eventId } },
            { new: true },
        );
        const response = await putAsStaff(`/user/unfollow/${TESTER_EVENT_FOLLOWING.eventId}/`).expect(StatusCode.SuccessOK);
        expect(JSON.parse(response.text)).toHaveProperty("message", "StatusSuccess");
        const updatedEvents = await Models.AttendeeFollowing.findOne({ userId: TESTER_ATTENDEE_FOLLOWING.userId });
        const updatedUsers = await Models.EventFollowing.findOne({ eventId: TESTER_EVENT_FOLLOWING.eventId });
        expect(updatedUsers).toEqual(expect.not.arrayContaining([TESTER_ATTENDEE_FOLLOWING.userId]));
        expect(updatedEvents).toEqual(expect.not.arrayContaining([TESTER_EVENT_FOLLOWING.eventId]));
    });

    it("works for an admin user", async () => {
        await Models.EventFollowing.findOneAndUpdate(
            { eventId: TESTER_EVENT_FOLLOWING.eventId },
            { $addToSet: { followers: TESTER_ATTENDEE_FOLLOWING.userId } },
            { new: true },
        );
        await Models.AttendeeFollowing.findOneAndUpdate(
            { userId: TESTER_ATTENDEE_FOLLOWING.userId },
            { $addToSet: { events: TESTER_EVENT_FOLLOWING.eventId } },
            { new: true },
        );
        const response = await putAsAdmin(`/user/unfollow/${TESTER_EVENT_FOLLOWING.eventId}/`).expect(StatusCode.SuccessOK);
        expect(JSON.parse(response.text)).toHaveProperty("message", "StatusSuccess");
        const updatedEvents = await Models.AttendeeFollowing.findOne({ userId: TESTER_ATTENDEE_FOLLOWING.userId });
        const updatedUsers = await Models.EventFollowing.findOne({ eventId: TESTER_EVENT_FOLLOWING.eventId });
        expect(updatedUsers).toEqual(expect.not.arrayContaining([TESTER_ATTENDEE_FOLLOWING.userId]));
        expect(updatedEvents).toEqual(expect.not.arrayContaining([TESTER_EVENT_FOLLOWING.eventId]));
    });
});
