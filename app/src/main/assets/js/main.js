window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded-----')
    const getdata = document.querySelector('#getdata')
    getdata.addEventListener('click', (e) => {
        e.preventDefault()
        console.log('getdata')
        fetch('https://api.github.com/users/octocat')
            .then((response) => response.json())
            .then((data) => {
                console.log('data', data)
                const greetMsgEl = document.querySelector('#greet-msg')
                greetMsgEl.textContent = data.login
            })
            .catch((error) => {
                console.error('error', error)
            })
    })
})
