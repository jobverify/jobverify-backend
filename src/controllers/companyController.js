import {
  getPublicCompanyByKey,
  listPublicCompanies,
} from "../services/companyDirectoryService.js";

const PUBLIC_CACHE_HEADER = "no-store";

export const getCompanies = async (req, res) => {
  try {
    res.set("Cache-Control", PUBLIC_CACHE_HEADER);
    const data = await listPublicCompanies({
      query: req.query.q,
      page: req.query.page,
      limit: req.query.limit,
      siteSettings: req.siteSettings,
    });

    return res.status(200).json({
      code: 200,
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getCompanies:", error);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "Server error while loading companies",
    });
  }
};

export const getCompanyByKey = async (req, res) => {
  try {
    res.set("Cache-Control", PUBLIC_CACHE_HEADER);
    const data = await getPublicCompanyByKey({
      companyKey: req.params.companyKey,
      siteSettings: req.siteSettings,
    });

    if (!data) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "Company not found",
      });
    }

    return res.status(200).json({
      code: 200,
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getCompanyByKey:", error);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "Server error while loading company",
    });
  }
};

