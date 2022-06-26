const formSubmitButton = $('form');
const username = $('form input[name="username"]');
const passwords = $('form input:password')

//Checking if the user name and password are valid before submiting
formSubmitButton.submit(function(form){

    if(username.val() != ""){
        const password = $(passwords[0]).val();
        const confirmPassword = $(passwords[1]).val();

        if((password != confirmPassword)){//checking if the two password fields do not match
            form.preventDefault();
            alert("the passwords do not match");
        }else if(!passwordIsLegal(password)){//Checking if the password is legal
            form.preventDefault();
            alert("password must contian letters, digits and special chars and must be at least 8 chars long")
        }
    } else {
        form.preventDefault();
        alert("username field must not be empty");
    }
    
});

//Checking if the password is at least 8 chars long 
//and contains digits, letters and special chars
const passwordIsLegal = function(password){
    const atLeast8Chars = (password.length >= 8);
    //true if the password contains a digit
    const hasDigits =  /\d/.test(password);

    //true if the password contains a letter
    const hasLetters =  /[a-zA-Z]/.test(password);
    
    //true if the password contains a sign
    const hasSigns =  /([\x21-\x2F]|[\x3A-\x40]|[\x5B-\x60]|[\x7B-\x7E])/.test(password);
    return(atLeast8Chars&&hasDigits&&hasLetters&&hasSigns);
}