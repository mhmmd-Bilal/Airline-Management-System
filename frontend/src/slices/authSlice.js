import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    userData: localStorage.getItem('authData') ?
        JSON.parse(localStorage.getItem('authData')) : null
}


const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentails: (state, action) => {
            state.userData = action.payload
            localStorage.setItem('authData', JSON.stringify(action.payload))
        },
        logout: (state) => {
            state.userData = null
            localStorage.clear()
        }
    }
})


export const { setCredentails, logout } = authSlice.actions
export default authSlice.reducer