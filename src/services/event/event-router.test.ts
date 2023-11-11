import { describe, expect, it, beforeEach } from "@jest/globals";
import { StatusCode } from "status-code-enum";
import Models from "../../database/models.js";
import { getAsAttendee, getAsStaff } from "../../testTools.js";

const EXTERNAL_PUBLIC_EVENT = {
    eventId: "11111c072182654f163f5f0f9a621d72",
    name: "Example Pub Event 10",
    description: "This is a description",
    startTime: 1532202702,
    endTime: 1532212702,
    locations: [
        {
            description: "Example Location",
            tags: ["SIEBEL0", "ECEB1"],
            latitude: 40.1138,
            longitude: -88.2249,
        },
    ],
    sponsor: "Example sponsor",
    eventType: "OTHER",
    points: 0,
};

const INTERNAL_PUBLIC_EVENT = {
    ...EXTERNAL_PUBLIC_EVENT,
    displayOnStaffCheckIn: false,
    isPrivate: false,
    isAsync: false,
};

const EXTERNAL_STAFF_EVENT = {
    eventId: "00000c072182654f163f5f0f9a621d72",
    name: "Example Staff Event 10",
    description: "This is a description",
    startTime: 1532202702,
    endTime: 1532212702,
    locations: [],
    eventType: "OTHER",
    
};

const INTERNAL_STAFF_EVENT = {
    ...EXTERNAL_STAFF_EVENT, 
    sponsor: "Example sponsor",
    displayOnStaffCheckIn: false,
    isPrivate: false,
    isAsync: false,
    isStaff: true
}

const METADATA = {
    eventId: "22222c072182654f163f5f0f9a621d72",
    isStaff: false,
    exp: 1234567890,
};

beforeEach(async () => {
    Models.initialize();
    await Models.StaffEvent.create(INTERNAL_STAFF_EVENT);
    await Models.PublicEvent.create(INTERNAL_PUBLIC_EVENT);
    await Models.EventMetadata.create(METADATA);
});

describe("GET /event/", () => {
    it("returns only filtered attendee events for attendees", async () => {
        const response = await getAsAttendee("/event/").expect(StatusCode.SuccessOK);

        expect(JSON.parse(response.text)).toMatchObject({
            events: [EXTERNAL_PUBLIC_EVENT],
        });
    });

    it("returns all attendee events for staff", async () => {
        const response = await getAsStaff("/event/").expect(StatusCode.SuccessOK);

        expect(JSON.parse(response.text)).toMatchObject({
            events: [INTERNAL_PUBLIC_EVENT],
        });
    });
});

describe("GET /event/staff/", () => {
    it("cannot be accessed by a non-staff user", async () => {
        const response = await getAsAttendee("/event/staff/").expect(StatusCode.ClientErrorForbidden);
        expect(response).toHaveProperty("error");
    });

    it("returns staff events for staff endpoint", async () => {
        const response = await getAsStaff("/event/staff/").expect(StatusCode.SuccessOK);
        expect(JSON.parse(response.text)).toMatchObject({
            events: [EXTERNAL_STAFF_EVENT],
        });
    });
});

describe("GET /event/metadata/:EVENTID", () => {
    it("cannot be accessed by a non-staff user", async () => {
        const eventId = METADATA.eventId;
        const response = await getAsAttendee(`/event/metadata/${eventId}`).expect(StatusCode.ClientErrorForbidden);
        expect(response).toHaveProperty("error");
    });

    it("returns metadata for a particular eventId", async () => {
        const eventId = METADATA.eventId;
        const response = await getAsStaff(`/event/metadata/${eventId}`).expect(StatusCode.SuccessOK);
        expect(JSON.parse(response.text)).toMatchObject(METADATA);       
    });

    it("throws an error if a bad eventId is passed in", async () => {
        const eventId = "badEventId";
        const response = await getAsStaff(`/event/metadata/${eventId}`).expect(StatusCode.ClientErrorBadRequest);
        expect(JSON.parse(response.text)).toHaveProperty("error");       
    });
});