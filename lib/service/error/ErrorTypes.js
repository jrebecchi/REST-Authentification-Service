class OperationalError extends Error {
    constructor(redirection, flashMessage){
        super();
        this.redirection = redirection;
        this.flashMessage = flashMessage
    }
}

module.exports = {
    OperationalError:  OperationalError,
    EmailAlreadyExistsError: class EmailAlreadyExistsError extends OperationalError {},
    UsernameAlreadyExistsError: class UsernameAlreadyExistsError extends OperationalError {},
    WrongPasswordError: class WrongPasswordError extends OperationalError {},
    WrongPasswordError: class WrongPasswordError extends OperationalError {},
    WrongLoginError:class WrongLoginError extends OperationalError {},
    UpdatePasswordTooLateError:class UpdatePasswordTooLateError extends OperationalError {},
    EmailNotSentError: class EmailNotSentError extends OperationalError {},
    UserNotFound: class UserNotFound extends OperationalError {},
}