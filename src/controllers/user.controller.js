// import {asyncHandler} from '../utils/asyncHandler.js';
// import {ApiError} from '../utils/ApiError.js';
// import { User } from '../models/user.model.js';
// import {uploadOnCloudinary} from '../utils/cloudinary.js';
// import {ApiResponse} from '../utils/ApiResponse.js' ;

// const generateAccessAndRefreshTokens = async(userID) => {
//     try {
//         const user = await User.findById(userID) ;
//         const accessToken = user.generateAccessToken() ;
//         const refreshToken = user.generateRefreshToken() ;
//     } catch (error) {
//         throw new ApiError(500 , "Something went wrong while generating the tokens")
//     }
// } 

// const registerUser = asyncHandler(async (req , res) => {

//     //Step 1 : get the details from the user by Frontend
//     //Step 2 : validation - not empty, email format, password length
//     //Step 3 : check if the user already exists: username , email
//     //Step 4 : check the images , check for avatar
//     //Step 5 : upload them to cloudinary  - avatar
//     //Step 6 : create a user object - create entry in data base
//     //Step 7 : remove the password and refresh tokens from the response
//     //Step 8 : check for user creation
//     //Step 9 : return the response

//     const {fullname , email , username , password} = req.body;

//     if (fullname === "") {
//         throw new ApiError(400 , "Full Name is required");
//     }
//     if (email === "") {
//         throw new ApiError(400 , "Email is required");
//     }
//     if (username === "") {
//         throw new ApiError(400 , "User Name is required");
//     }
//     if (password === "") {
//         throw new ApiError(400 , "Password is required");
//     }
//     if (email.includes("@") == false) {
//         throw new ApiError(400 , "Invalid Email");
//     }


//     const existedUser = await User.findOne({
//         $or: [{ email } , { username }]
//     })

//     if (existedUser) {
//         throw new ApiError(409 , "User already exists");
//     }

//     const avatarLocalPath = req.files?.avatar[0]?.path ;
//     if (!avatarLocalPath) {
//         throw new ApiError(400, "Avatar file is required");
//     }

//     let coverImageLocalPath ; 
//     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
//         coverImageLocalPath = req.files.coverImage[0].path ;
//     }


//     const avatar = await uploadOnCloudinary(avatarLocalPath) ;
//     const coverImage = await uploadOnCloudinary(coverImageLocalPath) ;

//     if (!avatar) {
//         throw new ApiError(400 , "Avatar is required") ;
//     }

//     const user = await User.create({
//         fullname , 
//         email , 
//         username: username.toLowerCase() , 
//         password , 
//         avatar: avatar.url , 
//         coverImage: coverImage?.url || ""
//     })

//     const createdUser = await User.findById(user._id).select(
//         "-password -refreshToken"
//     )

//     if (!createdUser) {
//         throw new ApiError(500 , "Something went wrong while registering the user")
//     }

//     return res.status(201).json(
//         new ApiResponse(200 , createdUser , "User registered Successfully")
//     )
// })

// const loginUser = asyncHandler(async (req , res) => {
//     // Step 1 : get the user details from req.body
//     // Step 2 : login by Username or Email
//     // Step 3 : check if the user exists
//     // Step 4 : Password validation
//     // Step 5 : Generate the JWT (access , refresh) token
//     // Step 6 : send the response

//     const {email , username , password} = req.body ;

//     if (!username || !email) {
//         throw new ApiError(400 , "Username or Email is required");
//     }

//     const user = await User.findOne({
//         $or: [{username}, {email}]
//     })

//     if (!user) {
//         throw new ApiError(404 , "User not found");
//     }

//     const isPasswordValid = await user.isPasswordCorrect(password) ;

//     if (!isPasswordValid) {
//         throw new ApiError(401 , "Invalid Password");
//     }
// })

// export {
//     registerUser ,
//     loginUser
// };





import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userID) => {
    try {
        const user = await User.findById(userID);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating the tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;

    if (!fullname) throw new ApiError(400, "Full Name is required");
    if (!email) throw new ApiError(400, "Email is required");
    if (!username) throw new ApiError(400, "User Name is required");
    if (!password) throw new ApiError(400, "Password is required");
    if (!email.includes("@")) throw new ApiError(400, "Invalid Email");

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    let coverImageLocalPath;
    if (req.files?.coverImage?.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    if (!avatar) {
        throw new ApiError(400, "Avatar is required");
    }

    const user = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "Username or Email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user.__id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                }, "User logged in successfully")
        );

});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        { new: true }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))

});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError (401 , error?.message || "Invalid Refresh Token")
    }
})

const changeCurrentPassword = asyncHandler( async(req , res) => {
    const {oldPassword , newPassword} = req.body ;

    // if (newPassword != confPassword) {
    //     throw new ApiError()
    // }

    const user = await User.findById(req.user?._id) ;
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400 , "Invalid password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})
    
    return res
    .status(200)
    .json(new ApiResponse(200 , {} , "Password changed successfully"))
})

const getCurrentUse = asyncHandler( async(req , res) => {
    return res
    .status(200)
    .json(200 , res.user, "Current user fetched successfully")
})

const updateAccountDetails = asyncHandler( async(req,res) => {
    const {fullname , email} = req.body

    if (!fullname || !email) {
        throw new ApiError (400 , "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname , email
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse (200 , user , "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler( async(req , rees) => {
    const avatarLocalPath = req.file?.path ;

    if (!avatarLocalPath) {
        throw new ApiError(400 , "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400 , "Error while uploading on avatar")
    }

    await User.findById(res.user?._id , 
        {
            $set : {
                avatar : avatar.url
            }
        }, 
        {new: true}
    ).select("-password")

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUse,
    updateAccountDetails,
    updateUserAvatar
};
