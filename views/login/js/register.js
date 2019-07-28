const pug = require('pug');
const fs = require('fs');
const remote = require('electron').remote;

$(document).ready(function () {
    let accountValidator = new AccountValidator();

    $('#account-form').ajaxForm({
        beforeSubmit: () => accountValidator.validateForm(),
        success: (responseText, status) => {
            if (status === 'success')
                $('.modal-alert').modal('show');
        },
        error: error => {
            if (error.responseText === 'email-taken') {
                accountValidator.showInvalidEmail();
            } else if (error.responseText === 'username-taken') {
                accountValidator.showInvalidUserName();
            }
        }
    });
    $('#name-tf').focus();

    $('#account-form h2').text('Register');
    $('#account-form #sub').text('Please tell us a little about yourself');
    let cancelBtn = $('#account-form-btn1');
    cancelBtn.html('Cancel');
    let submitBtn = $('#account-form-btn2');
    submitBtn.html('Submit');
    submitBtn.addClass('btn-primary');

    $('.modal-alert').modal({show: false, backdrop: 'static'});
    $('.modal-alert .modal-header h4').text('Account Created!');
    $('.modal-alert .modal-body p').html('Your account has been created.</br>Click OK to return to the login page.');

    cancelBtn.click(sendToRoot);
    $('.modal-alert #ok').click(() => {
        setTimeout(sendToRoot, 300);
    });

    function sendToRoot() {
        let params = {
            title: 'Login'
        };

        let appPath = remote.app.getAppPath();
        let html = pug.renderFile(appPath + '/views/login/login.pug', params);
        remote.getCurrentWindow().loadURL('data:text/html,' + encodeURIComponent(html), {
            baseURLForDataURL: `file://${appPath}/views/login/`
        });
    }
});