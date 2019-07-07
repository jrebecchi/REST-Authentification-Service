const PASSWORD_LENGTH = 8;

module.exports.analyse = (password, confirmPassword) => {
    const notifications = [];
    let isValid = true;

    if (password.length < PASSWORD_LENGTH) {
        isValid = false;
        notifications.push({ type: 'error', message: "The password must contains more than " + PASSWORD_LENGTH + " characters!" });
    }
    if (!(confirmPassword === password)) {
        isValid = false;
        notifications.push({ type: 'error', message: "The passwords don't match!" });

    }
    return { isValid, notifications };
};