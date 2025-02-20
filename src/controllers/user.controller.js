import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js'

const registerUser = asyncHandler(async (req , res) => {

    //Step 1 : get the details from the user by Frontend
    //Step 2 : validation - not empty, email format, password length
    //Step 3 : check if the user already exists: username , email
    //Step 4 : check the images , check for avatar
    //Step 5 : upload them to cloudinary  - avatar
    //Step 6 : create a user object - create entry in data base
    //Step 7 : remove the password and refresh tokens from the response
    //Step 8 : check for user creation
    //Step 9 : return the response
    
    const {fullname , email , username , password} = req.body;

    if (fullname === "") {
        throw new ApiError(400 , "Full Name is required");
    }
    if (email === "") {
        throw new ApiError(400 , "Email is required");
    }
    if (username === "") {
        throw new ApiError(400 , "User Name is required");
    }
    if (password === "") {
        throw new ApiError(400 , "Password is required");
    }
    if (email.includes("@") == false) {
        throw new ApiError(400 , "Invalid Email");
    }


    const existedUser = await User.findOne({
        $or: [{ email } , { username }]
    })

    if (existedUser) {
        throw new ApiError(409 , "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path ;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    
    let coverImageLocalPath ; 
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path ;
    }

    
    const avatar = await uploadOnCloudinary(avatarLocalPath) ;
    const coverImage = await uploadOnCloudinary(coverImageLocalPath) ;

    if (!avatar) {
        throw new ApiError(400 , "Avatar is required") ;
    }

    const user = await User.create({
        fullname , 
        email , 
        username: username.toLowerCase() , 
        password , 
        avatar: avatar.url , 
        coverImage: coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500 , "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User registered Successfully")
    )
})

export {registerUser};