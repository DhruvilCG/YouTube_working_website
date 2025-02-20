import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
})

export const upload = multer({
    storage: storage ,
});




// import multer from "multer";
// import path from "path";
// import { fileURLToPath } from "url";

// // Get __dirname equivalent in ES modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         // Go two levels up to find 'public/temp' in the project root
//         cb(null, path.join(__dirname, "../../public/temp"));
//     },
//     filename: function (req, file, cb) {
//         // Keep the original filename
//         cb(null, file.originalname);
//     }
// })


// export const upload = multer({
//     storage: storage
// });
