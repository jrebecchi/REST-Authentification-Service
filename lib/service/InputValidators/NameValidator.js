const NAME_LENGTH = 2;

module.exports.isValid = (name) => {
    const notifications = [];
    let isValid = true;

    const re = /^[a-zA-z]+([ '\-][a-zA-Z]+)*$/;
    if (name.length < NAME_LENGTH) {
        isValid = false;
        notifications.push({ type: 'error', message: "The name must contains more than 2 characters!" });
    }
    else if (!re.test(name)) {
        isValid = false;
        notifications.push({ type: 'error', message: "Uncorrect name !" });
    }
    return { isValid, notifications };
}