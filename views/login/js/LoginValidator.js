function LoginValidator() {
    this.loginErrors = $('.modal-alert');

    this.showLoginError = (title, message) => {
        $('.modal-alert .modal-header h4').text(title);
        $('.modal-alert .modal-body').html(message);
        this.loginErrors.modal('show');
    }
}

LoginValidator.prototype.validateForm = function () {
    if ($('#email-tf').val() === '') {
        this.showLoginError('Whoops!', 'Please enter a valid username');
        return false;
    } else if ($('#pass-tf').val() === '') {
        this.showLoginError('Whoops!', 'Please enter a valid password');
        return false;
    } else {
        return true;
    }
};