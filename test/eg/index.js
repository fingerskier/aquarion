import second from './second.js'


try {
  console.log('This is the primary module')
  
  second()
} catch (error) {
  console.error('Error:', error)
} finally {
  console.log('The test app is fin')
}