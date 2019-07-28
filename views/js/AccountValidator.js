function AccountValidator() {
    this.formFields = [$('#email-tf'), $('#user-tf'), $('#pass-tf'), $('#pass-confirm-tf')];

    this.alert = $('.modal-form-errors');
    this.alert.modal({show: false, backdrop: true});

    this.validateName = input => input.length >= 3;

    this.validatePassword = input => {
        // if user is logged in and hasn't changed their password, return ok
        if ($('#userId').val() && input === '') {
            return true;
        } else {
            return input.length >= 6;
        }
    };

    this.confirmPassword = (input, confirm) => {
        if ($('#userId').val() && input === '') {
            return true;
        } else {
            return input === confirm;
        }
    };

    this.validateEmail = input => {
        let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(input);
    };

    this.showErrors = (field) => {
        $('.modal-form-errors .modal-body p').text('Please correct the following problems :');

        let ul = $('.modal-form-errors .modal-body ul');
        ul.empty();
        for (let i = 0; i < field.length; i++)
            ul.append('<li>' + field[i] + '</li>');

        this.alert.modal('show');
    };

}

AccountValidator.prototype.showInvalidEmail = function () {
    // this.controlGroups[0].addClass('error');
    this.showErrors(['That email address is already in use.']);
};

AccountValidator.prototype.showInvalidUserName = function () {
    // this.controlGroups[1].addClass('error');
    this.showErrors(['That username is already in use.']);
};

AccountValidator.prototype.validateForm = function () {
    let errors = [];

    if (!this.validateEmail(this.formFields[0].val())) {
        errors.push('Please Enter A Valid Email');
    }
    if (!this.validateName(this.formFields[1].val())) {
        errors.push('Please Choose A Username');
    }
    if (!this.validatePassword(this.formFields[2].val())) {
        errors.push('Password Should Be At Least 6 Characters');
    }
    if (!this.confirmPassword(this.formFields[2].val(), this.formFields[3].val())) {
        errors.push('Please Enter Your Password Twice Identically');
    }

    if (errors.length)
        this.showErrors(errors);
    return errors.length === 0;
};