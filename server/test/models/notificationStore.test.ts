import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import {
  insertNotification,
  listNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotificationStore,
} from "../../src/models/notificationStore";

import { insertUser } from "../../src/models/userStore";
import type { StoredNotification } from "../../src/models/notificationStore";

const userA = "notification-store-user-a";
const userB = "notification-store-user-b";

before(() => {
  insertUser({
    id: userA,
    firstName: "Test",
    lastName: "User A",
    email: "notification-user-a@test.dev",
    password: "password123",
    role: "user",
  });

  insertUser({
    id: userB,
    firstName: "Test",
    lastName: "User B",
    email: "notification-user-b@test.dev",
    password: "password123",
    role: "user",
  });
});

beforeEach(() => {
  clearNotificationStore();
});

function makeNotification(
  id: string,
  userId: string,
  read = false,
  timestamp = new Date().toISOString(),
): StoredNotification {
  return {
    id,
    userId,
    message: `Test notification ${id}`,
    type: "queue_update",
    timestamp,
    read,
  };
}

describe("insertNotification and listNotificationsForUser", () => {
  it("inserts a notification and retrieves it for the correct user", () => {
    const notification = makeNotification("notification-1", userA);

    insertNotification(notification);

    const results = listNotificationsForUser(userA);

    assert.equal(results.length, 1);
    assert.deepEqual(results[0], notification);
  });
  it("only returns notifications belonging to the requested user, newest first", () => {
    const older = makeNotification(
      "notification-older",
      userA,
      false,
      "2026-11-06T10:00:00.000Z",
    );

    const newer = makeNotification(
      "notification-newer",
      userA,
      false,
      "2026-11-06T12:00:00.000Z",
    );

    const otherUser = makeNotification("notification-user-b", userB);

    insertNotification(older);
    insertNotification(otherUser);
    insertNotification(newer);

    const results = listNotificationsForUser(userA);

    assert.equal(results.length, 2);
    assert.ok(results[0]);
    assert.ok(results[1]);

    assert.equal(results[0].id, "notification-newer");
    assert.equal(results[1].id, "notification-older");
  });
});

describe("markNotificationRead", () => {
  it("marks a notification as read and returns the updated notification", () => {
    const notification = makeNotification("notification-read-1", userA);

    insertNotification(notification);

    const updated = markNotificationRead(userA, notification.id);

    assert.ok(updated);
    assert.equal(updated.read, true);
  });
  it("does not allow a user to mark another user's notification as read", () => {
    const notification = makeNotification("notification-read-2", userA);

    insertNotification(notification);

    const updated = markNotificationRead(userB, notification.id);

    assert.equal(updated, undefined);

    const results = listNotificationsForUser(userA);
    assert.ok(results[0]);
    assert.equal(results[0].read, false);
  });
});

describe("markAllNotificationsRead", () => {
  it("marks all notifications as read for the specified user only", () => {
    insertNotification(makeNotification("all-read-1", userA));
    insertNotification(makeNotification("all-read-2", userA));
    insertNotification(makeNotification("all-read-3", userB));

    markAllNotificationsRead(userA);

    const userAResults = listNotificationsForUser(userA);
    const userBResults = listNotificationsForUser(userB);

    assert.equal(userAResults.length, 2);
    assert.equal(
      userAResults.every((notification) => notification.read),
      true,
    );

    assert.equal(userBResults.length, 1);
    assert.equal(userBResults[0]?.read, false);
  });
});

describe("clearNotificationStore", () => {
  it("removes all notifications from the database", () => {
    insertNotification(makeNotification("clear-1", userA));
    insertNotification(makeNotification("clear-2", userB));

    clearNotificationStore();

    assert.equal(listNotificationsForUser(userA).length, 0);
    assert.equal(listNotificationsForUser(userB).length, 0);
  });
});
