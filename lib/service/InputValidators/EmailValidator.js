module.exports.analyse = (email) => {
    const notifications = [];
    let isValid = true;

    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(email)) {
        isValid = false;
        notifications.push({ type: 'error', message: "The email adress is not valid !" });
    }
    return { isValid, notifications };
};
