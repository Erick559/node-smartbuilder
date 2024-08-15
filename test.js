const data = {num1:1,num2:2}
fetch('https://node-smartbuilder.onrender.com/calculate',{
  method:'POST',
  headers: {
    'Content-Type':'application/json',
  },
  body:JSON.stringify(data),
})
.then(response=> response.json())
.then(result => alert(JSON.stringify(result.error)))
.catch(error => alert(error))