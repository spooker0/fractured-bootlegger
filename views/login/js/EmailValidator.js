function EmailValidator() {
    let modal = $('#get-credentials');
    let alert = $('#get-credentials .alert');

    this.modal = modal;
    this.alert = alert;
    this.modal.on('show.bs.modal', function () {
        $('#get-credentials-form').resetForm();
        alert.hide();
    });
}

EmailValidator.prototype.validateEmail = function (email) {
    let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
};

EmailValidator.prototype.showEmailAlert = function (message) {
    this.alert.attr('class', 'alert alert-danger');
    this.alert.html(message);
    this.alert.show();
};

EmailValidator.prototype.hideEmailAlert = function () {
    this.alert.hide();
};

EmailValidator.prototype.showEmailSuccess = function (message) {
    this.alert.attr('class', 'alert alert-success');
    this.alert.html(message);
    this.alert.fadeIn(500);
};