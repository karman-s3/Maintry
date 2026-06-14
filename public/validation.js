
const form = document.getElementById('signupForm')
const firstname_input = document.getElementById('firstname-input')
const email_input = document.getElementById('email-input')
const password_input = document.getElementById('password-input')
const repeat_password_input = document.getElementById('repeat-password-input')
const error_message = document.getElementById('error-message')

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  let errors = []

  if (firstname_input) {
    errors = getSignupFormErrors(
      firstname_input.value,
      email_input.value,
      password_input.value,
      repeat_password_input.value
    )
  } else {
    errors = getLoginFormErrors(
      email_input.value,
      password_input.value
    )
  }

  if (errors.length > 0) {
    error_message.innerText = errors.join(". ")
    return
  }

  // only will run on signup page
  if (firstname_input) {
    try {
      error_message.innerText = "Creating your account..."

      const res = await fetch('/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstname: firstname_input.value,
          email: email_input.value,
          password: password_input.value
        })
      })

      const data = await res.json()

      error_message.innerText = data.message

    } catch (err) {
      console.error(err)
      error_message.innerText = "Server not responding"
    }
  }

  // only runs on login page
  if (!firstname_input) {
  try {
    error_message.innerText = "Logging in..."

    const res = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email_input.value,
        password: password_input.value
      })
    })

    const data = await res.json()

    if (res.ok) {
      error_message.innerText = "Successful! Redirecting .."
      localStorage.setItem("token", data.token)

      setTimeout(() => {
        window.location.href = "home.html"
      }, 1000)
    } else {
      error_message.innerText = data.message
    }

  } catch (err) {
    error_message.innerText = "Server error"
  }
}

})

function getSignupFormErrors(firstname, email, password, repeatPassword){
  let errors = []

  if(firstname === '' || firstname == null){
    errors.push('First Name Is Required')
    firstname_input.parentElement.classList.add('incorrect')
  }
  
  else if (email === '' || email == null ){
    errors.push('Email Is Required')
    email_input.parentElement.classList.add('incorrect')
  }

  else if (!email.includes('@') || !email.includes('.')){
    errors.push('Please Enter A Valid Email')
    email_input.parentElement.classList.add('incorrect')
  }
  
  else if(password === '' || password == null){
    errors.push('Password Is Required')
    password_input.parentElement.classList.add('incorrect')
    
  }

  else if(password.length < 8){
    errors.push('Password Must Contain 8 Or More Characters')
    password_input.parentElement.classList.add('incorrect')
  }
  else if(password !== repeatPassword){
    errors.push('Password Does Not Match Repeated Password')
    password_input.parentElement.classList.add('incorrect')
    repeat_password_input.parentElement.classList.add('incorrect')
  }


  return errors;
} 

function getLoginFormErrors(email, password){
  let errors = []

  if(email === '' || email == null){
    errors.push('Email Is Required')
    email_input.parentElement.classList.add('incorrect')
  }
  else if (!email.includes('@') || !email.includes('.')){
    errors.push('Please Enter A Valid Email')
    email_input.parentElement.classList.add('incorrect')
  }
  else if(password === '' || password == null){
    errors.push('Password Is Required')
    password_input.parentElement.classList.add('incorrect')
  }

  return errors;
}

//filter the array, if input element is not there it will be filtered out of the array
const allInputs = [firstname_input, email_input, password_input, repeat_password_input].filter(input => input != null)


// useless (removed as displaying one error at a time)
allInputs.forEach(input => {
  input.addEventListener('input', () => {
    if(input.parentElement.classList.contains('incorrect')){
      input.parentElement.classList.remove('incorrect')
      error_message.innerText = ''
    }
  })
})