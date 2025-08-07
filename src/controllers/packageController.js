import PackageModel from '../models/Package.js';

export const getPackages = async (req, res) => {
  try {
    const { type } = req.query;
    if (!type || !['Free', 'Paid'].includes(type)) {
      return res.status(400).json({ message: 'A valid type (Free or Paid) is required.' });
    }
    const packages = await PackageModel.findAllByType(type);
    res.json({ packages });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch packages.', error: error.message });
  }
};

export const createPackage = async (req, res) => {
  try {
    const { name } = req.body;
    const existingPackage = await PackageModel.findByName(name);
    if (existingPackage) {
      return res.status(409).json({ message: 'A package with this name already exists.' });
    }

    const newPackage = await PackageModel.create(req.body);
    await PackageModel.logAction(newPackage.id, req.user.id, 'create', newPackage, req);

    res.status(201).json({ message: 'Package saved successfully.', package: newPackage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create package.', error: error.message });
  }
};

export const updatePackage = async (req, res) => {
    try {
        const { id } = req.params;
        
        const updatedPackage = await PackageModel.update(id, req.body);
        if (!updatedPackage) {
            return res.status(400).json({ message: 'No updates detected. Please modify at least one field.' });
        }

        await PackageModel.logAction(id, req.user.id, 'update', req.body, req);
        res.json({ message: 'Package updated successfully.', package: updatedPackage });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ message: 'A package with this name already exists.' });
        }
        res.status(500).json({ message: 'Failed to update package.', error: error.message });
    }
};

export const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPackage = await PackageModel.delete(id);
    if (!deletedPackage) {
      return res.status(404).json({ message: 'Package not found.' });
    }

    await PackageModel.logAction(id, req.user.id, 'delete', deletedPackage, req);
    res.json({ message: 'Package deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete package.', error: error.message });
  }
};

export const updatePackageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedPackage = await PackageModel.updateStatus(id, status);
     if (!updatedPackage) {
      return res.status(404).json({ message: 'Package not found.' });
    }
    
    await PackageModel.logAction(id, req.user.id, 'status_change', { status }, req);
    res.json({ message: 'Package status updated successfully.', package: updatedPackage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update package status.', error: error.message });
  }
};