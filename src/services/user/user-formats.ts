export interface UserFormat {
	id: string,
	username: string,
	firstname: string,
	lastname: string,
	email: string,
}

/**
 * Checks whether an object conforms to the structure of UserFormat and has a valid email address.
 *
 * @param obj - The object to be checked.
 * @returns True if the object is a valid UserFormat with a valid email address, otherwise False.
 *
 */
export function isValidUserFormat(obj: UserFormat): boolean {
	if (
		typeof obj.id !== "string" ||
		typeof obj.username !== "string" ||
		typeof obj.firstname !== "string" ||
		typeof obj.lastname !== "string" ||
		typeof obj.email !== "string" || !isValidEmail(obj.email)
	) {
		return false;
	}
	return true;
}

/**
 * Checks if the provided string is a valid email address using a regular expression.
 *
 * @param email - The email address to be checked.
 * @returns True if the email address is valid, otherwise False.
 */
function isValidEmail(email: string): boolean {
	const emailRegex: RegExp = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
	return emailRegex.test(email);
}
