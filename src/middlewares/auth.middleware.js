import { User } from "../models/user.model";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async(req , res , next) => {
    
    try {
        const token = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ",  "")
    
        if (!token) {
            throw new ApiError(401 , "Unauthorized request");
        }
    
        const decodedTokenjwt = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedTokenjwt?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(401 , "Invalid Access Token");
        }
    
        req.user = user ;
        next() ;
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid Access Token");
    }

}) 