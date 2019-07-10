const USERNAME_LENGTH = 4;

module.exports.analyse = (username) => {
    const notifications = [];
    let isValid = true;
    if (!username) {
        isValid = false;
        notifications.push({ type: 'error', message: "No username provided" });
        return { isValid, notifications };
    }
    const re = /^[a-zA-Z0-9\-_.]*$/;
    if (username.length < USERNAME_LENGTH) {
        isValid = false;
        notifications.push({ type: 'error', message: "The username must contains more than 4 characters!" });
    }
    else if (!re.test(username)) {
        isValid = false;
        notifications.push({ type: 'error', message: "A username may only contain letters, numbers, dashes, dots and underscores !" });
    }
    return { isValid, notifications };
}