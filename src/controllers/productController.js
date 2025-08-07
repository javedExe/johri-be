import ProductModel from '../models/Product.js';
import { schemas } from '../utils/validation.js';

// This is a placeholder for a real cloud upload service
const uploadFilesToCloud = async (files) => {
    if (!files || files.length === 0) return [];
    // Simulate uploading and getting back URLs
    return files.map(file => `/uploads/images/${file.originalname}_${Date.now()}`);
};

export const createProduct = async (req, res) => {
    try {
        // Manually validate the text fields from the multipart form
        const { error } = schemas.createProduct.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // The userType is now reliably attached to req.user by Passport
        const userType = req.user.userType;
        if (!userType) {
            return res.status(403).json({ message: 'User role could not be determined. Please log in again.' });
        }

        const imageUrls = await uploadFilesToCloud(req.files);

        const productData = {
            ...req.body,
            images: imageUrls
        };

        const newProduct = await ProductModel.create(productData, req.user.id, userType);
        await ProductModel.logAction(newProduct.id, req.user.id, userType, 'create', newProduct, req);
        
        res.status(201).json({ message: 'Product created successfully.', product: newProduct });
    } catch (error) {
        console.error("Create Product Error:", error);
        res.status(500).json({ message: 'An error occurred while creating the product.' });
    }
};

export const getMyProducts = async (req, res) => {
    try {
        const userType = req.user.userType;
        if (!userType) {
            return res.status(403).json({ message: 'User role could not be determined. Please log in again.' });
        }
        const products = await ProductModel.findAllForUser(req.user.id, userType);
        res.json({ products });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch products.' });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductModel.findById(id);
        const userType = req.user.userType;

        if (!userType || !product || (product.owner_id !== req.user.id && product.jeweler_id !== req.user.id)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action.' });
        }

        const updatedProduct = await ProductModel.update(id, req.body);
        await ProductModel.logAction(id, req.user.id, userType, 'update', req.body, req);

        res.json({ message: 'Product updated successfully.', product: updatedProduct });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update product.' });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductModel.findById(id);
        const userType = req.user.userType;

        if (!userType || !product || (product.owner_id !== req.user.id && product.jeweler_id !== req.user.id)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action.' });
        }
        
        const deletedProduct = await ProductModel.delete(id);
        await ProductModel.logAction(id, req.user.id, userType, 'delete', deletedProduct, req);

        res.json({ message: 'Product deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete product.' });
    }
};