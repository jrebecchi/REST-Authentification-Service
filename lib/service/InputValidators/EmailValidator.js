module.exports.analyse = (email) => {
    const notifications = [];
    let isValid = true;

    if (!email) {
        isValid = false;
        notifications.push({ type: 'error', message: "No email provided" });
        return { isValid, notifications };
    }

    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(email)) {
        isValid = false;
        notifications.push({ type: 'error', message: "This email address is not valid!" });
    }
    return { isValid, notifications };
};
