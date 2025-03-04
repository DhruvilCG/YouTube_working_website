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
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
            $unset: {
                refreshToken: 1
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
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // if (newPassword != confPassword) {
    //     throw new ApiError()
    // }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, res.user, "Current user fetched successfully")
        )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname, email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar on Cloudinary")
    }

    const user = await User.findById(res.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar image updated successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.url;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage) {
        throw new ApiError(400, "Error while uploading avatar on Cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.path
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover Image updated successfully")
        )

})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200 , channel[0] , "User channel fetched successfully")
    )

})

const getWatchHistory = asyncHandler( async(req , res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        } ,
        {
            $lookup: {
                from: "videos" ,
                localField: "watchHistory" ,
                foreignField: "_id" ,
                as: "watchHistory" ,
                pipeline: [
                    {
                        $lookup: {
                            from: "users" ,
                            localField: "owner" ,
                            foreignField: "_id" ,
                            as: "owner" ,
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1 ,
                                        username: 1 ,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    } ,
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200 , user[0].watchHistory , "Watch history fetched successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};
