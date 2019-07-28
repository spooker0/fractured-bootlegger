const pug = require('pug');
const fs = require('fs');
const remote = require('electron').remote;

$(document).ready(() => {
    let accountValidator = new AccountValidator();

    $('#account-form').ajaxForm({
        beforeSubmit: (formData) => {
            return accountValidator.validateForm();

        },
        success: (responseText, status) => {
            if (status === 'success') {
                let modalAlert = $('.modal-alert');
                modalAlert.modal({show: false, keyboard: true, backdrop: true});
                $('.modal-alert .modal-header h4').text('Success!');
                $('.modal-alert .modal-body p').html('Your account has been updated.');
                modalAlert.modal('show');
                $('.modal-alert button').off('click');
            }
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

    $('#account-form h2').text('Account Settings');
    $('#account-form #sub').text('Here are the current settings for your account.');
    let accountForm = $('#account-form-btn1');
    accountForm.html('Delete');
    accountForm.removeClass('btn-outline-dark');
    accountForm.addClass('btn-danger');
    $('#account-form-btn2').html('Update');


    $('.modal-confirm').modal({show: false, keyboard: true, backdrop: true});
    $('.modal-confirm .modal-header h4').text('Delete Account');
    $('.modal-confirm .modal-body p').html('Are you sure you want to delete your account?');
    $('.modal-confirm .cancel').html('Cancel');

    let modalConfirmSubmit = $('.modal-confirm .submit');
    modalConfirmSubmit.html('Delete');
    modalConfirmSubmit.addClass('btn-danger');

    $('#btn-logout').click(() => {
        $.ajax({
            url: 'https://doublecolossus.com/logout',
            type: 'POST',
            data: {logout: true},
            success: data => {
                showLockedAlert('You are now logged out.<br>Redirecting you back to the homepage.');
            },
            error: error => {
                console.log(error.responseText + ' :: ' + error.statusText);
            }
        });
    });

    accountForm.click(() => {
        $('.modal-confirm').modal('show')
    });

    modalConfirmSubmit.click(() => {
        $('.modal-confirm').modal('hide');
        $.ajax({
            url: 'https://doublecolossus.com/delete',
            type: 'POST',
            success: data => {
                showLockedAlert('Your account has been deleted.<br>Redirecting you back to the homepage.');
            },
            error: error => {
                console.log(error.responseText + ' :: ' + error.statusText);
            }
        });

    });
});

function showLockedAlert(message) {
    let modalAlert = $('.modal-alert');
    modalAlert.modal({show: false, keyboard: false, backdrop: 'static'});
    $('.modal-alert .modal-header h4').text('Success!');
    $('.modal-alert .modal-body p').html(message);
    modalAlert.modal('show');
    $('.modal-alert button').click(function () {
        sendToRoot();
    });
    setTimeout(sendToRoot, 3000);

}

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