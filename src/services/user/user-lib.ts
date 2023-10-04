import { FilteredUserView, User } from "./user-models";

/**
 * Truncates a InternalEvent object to create an ExternalEvent by omitting
 * the 'isPrivate', 'displayOnStaffCheckIn', and 'isStaff' properties.
 *
 * @param baseEvent The object to convert into a public event.
 * @returns The truncated ExternalEvent object.
 */
export function createFilteredUserView(user: User): FilteredUserView {
	const filteredUser: FilteredUserView = {
		id: user.userId,
		username: user.username,
		firstname: user.firstName,
		lastname: user.lastName,
		email: user.email,
	};

	return filteredUser;
}
