const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get spas by category (verified, unverified, blacklisted)
router.get('/spas', async (req, res) => {
    try {
        const { category = 'all', search, page = 1, limit = 12 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        let params = [];

        // Category filtering
        switch (category) {
            case 'verified':
                whereClause += ' AND s.status = "verified" AND s.annual_fee_paid = 1';
                break;
            case 'unverified':
                whereClause += ' AND s.status = "verified" AND s.annual_fee_paid = 0';
                break;
            case 'blacklisted':
                whereClause += ' AND s.blacklist_reason IS NOT NULL';
                break;
            case 'all':
                whereClause += ' AND s.status IN ("verified")';
                break;
            default:
                whereClause += ' AND s.status = "verified"';
        }

        // Search functionality
        if (search) {
            whereClause += ' AND (s.name LIKE ? OR s.address_line1 LIKE ? OR s.province LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        const [spas] = await db.execute(`
      SELECT 
        s.id,
        s.name,
        s.reference_number,
        s.address_line1,
        s.address_line2,
        s.province,
        s.postal_code,
        s.spa_tel,
        s.status,
        s.annual_fee_paid,
        s.blacklist_reason,
        s.created_at,
        s.spa_banner_photos_path,
        s.facility_photos,
        COUNT(t.id) as therapist_count,
        AVG(CASE WHEN r.rating THEN r.rating ELSE 0 END) as average_rating,
        COUNT(r.id) as review_count
      FROM spas s
      LEFT JOIN therapists t ON s.id = t.spa_id AND t.status = 'approved'
      LEFT JOIN reviews r ON s.id = r.spa_id
      WHERE ${whereClause}
      GROUP BY s.id
      ORDER BY 
        CASE 
          WHEN ? = 'verified' THEN s.annual_fee_paid 
          WHEN ? = 'unverified' THEN (1 - s.annual_fee_paid)
          ELSE s.created_at 
        END DESC,
        s.name ASC
      LIMIT ? OFFSET ?
    `, [...params, category, category, parseInt(limit), parseInt(offset)]);

        // Get total count for pagination
        const [countResult] = await db.execute(`
      SELECT COUNT(*) as total FROM spas s WHERE ${whereClause}
    `, params);

        // Process spa data
        const processedSpas = spas.map(spa => {
            let facilityPhotos = [];
            try {
                facilityPhotos = spa.facility_photos ? JSON.parse(spa.facility_photos) : [];
            } catch (error) {
                console.error('Error parsing facility photos:', error);
            }

            return {
                id: spa.id,
                name: spa.name,
                reference_number: spa.reference_number,
                address: {
                    line1: spa.address_line1,
                    line2: spa.address_line2,
                    province: spa.province,
                    postal_code: spa.postal_code
                },
                phone: spa.spa_tel,
                status: spa.status,
                category: getCategoryFromSpa(spa),
                spa_banner_photos_path: spa.spa_banner_photos_path,
                facility_photos: facilityPhotos.slice(0, 3), // First 3 photos for preview
                therapist_count: spa.therapist_count,
                average_rating: parseFloat(spa.average_rating || 0).toFixed(1),
                review_count: spa.review_count,
                created_at: spa.created_at,
                is_premium: spa.annual_fee_paid === 1,
                blacklist_reason: spa.blacklist_reason
            };
        });

        res.json({
            success: true,
            data: {
                spas: processedSpas,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(countResult[0].total / limit),
                    total_count: countResult[0].total,
                    limit: parseInt(limit)
                },
                category_stats: await getCategoryStats()
            }
        });

    } catch (error) {
        console.error('Error fetching spas:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch spas' });
    }
});

// Helper function to determine spa category
function getCategoryFromSpa(spa) {
    if (spa.blacklist_reason) return 'blacklisted';
    if (spa.status === 'verified' && spa.annual_fee_paid === 1) return 'verified';
    if (spa.status === 'verified' && spa.annual_fee_paid === 0) return 'unverified';
    return 'pending';
}

// Get category statistics for navigation
async function getCategoryStats() {
    try {
        const [stats] = await db.execute(`
      SELECT 
        COUNT(CASE WHEN status = 'verified' AND annual_fee_paid = 1 THEN 1 END) as verified_count,
        COUNT(CASE WHEN status = 'verified' AND annual_fee_paid = 0 THEN 1 END) as unverified_count,
        COUNT(CASE WHEN blacklist_reason IS NOT NULL THEN 1 END) as blacklisted_count,
        COUNT(*) as total_count
      FROM spas 
      WHERE status IN ('verified', 'rejected')
    `);

        return stats[0];
    } catch (error) {
        console.error('Error fetching category stats:', error);
        return { verified_count: 0, unverified_count: 0, blacklisted_count: 0, total_count: 0 };
    }
}

// Get individual spa details
router.get('/spas/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [spa] = await db.execute(`
      SELECT 
        s.*,
        COUNT(t.id) as therapist_count,
        AVG(CASE WHEN r.rating THEN r.rating ELSE 0 END) as average_rating,
        COUNT(r.id) as review_count
      FROM spas s
      LEFT JOIN therapists t ON s.id = t.spa_id AND t.status = 'approved'
      LEFT JOIN reviews r ON s.id = r.spa_id
      WHERE s.id = ? AND s.status = 'verified'
      GROUP BY s.id
    `, [id]);

        if (spa.length === 0) {
            return res.status(404).json({ success: false, error: 'Spa not found' });
        }

        const spaData = spa[0];

        // Get therapists
        const [therapists] = await db.execute(`
      SELECT 
        id, fname, lname, specialty, 
        therapist_image_path as profile_image
      FROM therapists 
      WHERE spa_id = ? AND status = 'approved'
      LIMIT 10
    `, [id]);

        // Get reviews
        const [reviews] = await db.execute(`
      SELECT 
        id, customer_name, rating, comment, created_at
      FROM reviews 
      WHERE spa_id = ? 
      ORDER BY created_at DESC
      LIMIT 5
    `, [id]);

        // Process facility photos
        let facilityPhotos = [];
        try {
            facilityPhotos = spaData.facility_photos ? JSON.parse(spaData.facility_photos) : [];
        } catch (error) {
            console.error('Error parsing facility photos:', error);
        }

        const processedSpa = {
            id: spaData.id,
            name: spaData.name,
            reference_number: spaData.reference_number,
            description: `Premium spa services in ${spaData.province}. Offering professional wellness treatments with certified therapists.`,
            contact: {
                phone: spaData.spa_tel,
                email: spaData.owner_email,
                address: {
                    line1: spaData.address_line1,
                    line2: spaData.address_line2,
                    province: spaData.province,
                    postal_code: spaData.postal_code
                }
            },
            owner: {
                name: `${spaData.owner_fname} ${spaData.owner_lname}`,
                phone: spaData.owner_tel
            },
            media: {
                banner_image: spaData.spa_photos_banner_path,
                facility_photos: facilityPhotos
            },
            stats: {
                therapist_count: spaData.therapist_count,
                average_rating: parseFloat(spaData.average_rating || 0).toFixed(1),
                review_count: spaData.review_count,
                established: new Date(spaData.created_at).getFullYear()
            },
            category: getCategoryFromSpa(spaData),
            is_premium: spaData.annual_fee_paid === 1,
            therapists: therapists.map(t => ({
                id: t.id,
                name: `${t.fname} ${t.lname}`,
                specialty: t.specialty,
                profile_image: t.profile_image
            })),
            recent_reviews: reviews
        };

        res.json({
            success: true,
            data: processedSpa
        });

    } catch (error) {
        console.error('Error fetching spa details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch spa details' });
    }
});

// Search spas with advanced filters
router.get('/search', async (req, res) => {
    try {
        const {
            q: query,
            province,
            category,
            min_rating,
            has_therapists,
            page = 1,
            limit = 12
        } = req.query;

        const offset = (page - 1) * limit;

        let whereClause = "s.status = 'verified'";
        let params = [];

        // Text search
        if (query) {
            whereClause += ' AND (s.name LIKE ? OR s.address_line1 LIKE ? OR t.specialty LIKE ?)';
            const searchTerm = `%${query}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Province filter
        if (province && province !== 'all') {
            whereClause += ' AND s.province = ?';
            params.push(province);
        }

        // Category filter
        if (category && category !== 'all') {
            switch (category) {
                case 'verified':
                    whereClause += ' AND s.annual_fee_paid = 1';
                    break;
                case 'unverified':
                    whereClause += ' AND s.annual_fee_paid = 0';
                    break;
                case 'blacklisted':
                    whereClause += ' AND s.blacklist_reason IS NOT NULL';
                    break;
            }
        }

        // Rating filter
        if (min_rating) {
            whereClause += ' AND AVG(r.rating) >= ?';
            params.push(parseFloat(min_rating));
        }

        // Has therapists filter
        if (has_therapists === 'true') {
            whereClause += ' AND COUNT(t.id) > 0';
        }

        const [spas] = await db.execute(`
      SELECT 
        s.id, s.name, s.reference_number, s.address_line1, s.address_line2, 
        s.province, s.spa_tel, s.annual_fee_paid, s.spa_photos_banner_path,
        COUNT(DISTINCT t.id) as therapist_count,
        AVG(r.rating) as average_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM spas s
      LEFT JOIN therapists t ON s.id = t.spa_id AND t.status = 'approved'
      LEFT JOIN reviews r ON s.id = r.spa_id
      WHERE ${whereClause}
      GROUP BY s.id
      HAVING 1=1 ${min_rating ? 'AND AVG(r.rating) >= ?' : ''}
      ORDER BY s.annual_fee_paid DESC, average_rating DESC, s.name ASC
      LIMIT ? OFFSET ?
    `, [...params, ...(min_rating ? [parseFloat(min_rating)] : []), parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            data: {
                spas: spas.map(spa => ({
                    id: spa.id,
                    name: spa.name,
                    reference_number: spa.reference_number,
                    address: `${spa.address_line1}, ${spa.province}`,
                    phone: spa.spa_tel,
                    banner_image: spa.spa_photos_banner_path,
                    therapist_count: spa.therapist_count,
                    average_rating: parseFloat(spa.average_rating || 0).toFixed(1),
                    review_count: spa.review_count,
                    is_premium: spa.annual_fee_paid === 1,
                    category: spa.annual_fee_paid === 1 ? 'verified' : 'unverified'
                })),
                search_info: {
                    query,
                    province,
                    category,
                    min_rating,
                    has_therapists,
                    total_results: spas.length
                }
            }
        });

    } catch (error) {
        console.error('Error searching spas:', error);
        res.status(500).json({ success: false, error: 'Failed to search spas' });
    }
});

// Get provinces for filter dropdown
router.get('/provinces', async (req, res) => {
    try {
        const [provinces] = await db.execute(`
      SELECT DISTINCT province 
      FROM spas 
      WHERE province IS NOT NULL AND province != '' AND status = 'verified'
      ORDER BY province
    `);

        res.json({
            success: true,
            data: provinces.map(p => p.province)
        });

    } catch (error) {
        console.error('Error fetching provinces:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch provinces' });
    }
});

// Get featured spas for homepage
router.get('/featured', async (req, res) => {
    try {
        const [spas] = await db.execute(`
      SELECT 
        s.id, s.name, s.address_line1, s.province, s.spa_photos_banner_path,
        COUNT(t.id) as therapist_count,
        AVG(r.rating) as average_rating
      FROM spas s
      LEFT JOIN therapists t ON s.id = t.spa_id AND t.status = 'approved'
      LEFT JOIN reviews r ON s.id = r.spa_id
      WHERE s.status = 'verified' AND s.annual_fee_paid = 1
      GROUP BY s.id
      ORDER BY average_rating DESC, therapist_count DESC
      LIMIT 8
    `);

        res.json({
            success: true,
            data: spas.map(spa => ({
                id: spa.id,
                name: spa.name,
                location: `${spa.address_line1}, ${spa.province}`,
                banner_image: spa.spa_photos_banner_path,
                therapist_count: spa.therapist_count,
                rating: parseFloat(spa.average_rating || 0).toFixed(1)
            }))
        });

    } catch (error) {
        console.error('Error fetching featured spas:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch featured spas' });
    }
});

// Get verified SPAs for public display
router.get('/verified-spas', async (req, res) => {
    try {
        const { page = 1, limit = 12, search = '' } = req.query;

        console.log('API Request params:', { page, limit, search });

        // Safely parse and validate pagination parameters
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
        const offset = (pageNum - 1) * limitNum;

        console.log('Parsed params:', { pageNum, limitNum, offset });

        // Build query dynamically to avoid parameter mismatch
        let baseQuery = `
            SELECT 
                s.id,
                s.name,
                s.spa_br_number,
                s.owner_fname,
                s.owner_lname,
                COALESCE(s.email, s.owner_email) as email,
                COALESCE(s.phone, s.spa_tel) as phone,
                COALESCE(
                    s.address,
                    CONCAT_WS(', ', 
                        NULLIF(s.address_line1, ''), 
                        NULLIF(s.address_line2, ''), 
                        NULLIF(s.province, ''), 
                        NULLIF(s.postal_code, '')
                    )
                ) as address,
                s.status,
                s.created_at,
                s.spa_banner_photos_path
            FROM spas s
            WHERE s.status = 'verified'
        `;

        let countQuery = `SELECT COUNT(*) as total FROM spas s WHERE s.status = 'verified'`;
        let queryParams = [];

        // Add search if provided - including spa_br_number in search
        if (search && search.trim()) {
            const searchCondition = ` AND (s.name LIKE ? OR s.spa_br_number LIKE ? OR s.address_line1 LIKE ? OR s.owner_fname LIKE ? OR s.owner_lname LIKE ?)`;
            baseQuery += searchCondition;
            countQuery += searchCondition;
            const searchTerm = `%${search.trim()}%`;
            queryParams = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
        }

        // Get total count first
        const [countResult] = await db.execute(countQuery, queryParams);
        const total = countResult[0].total;

        // Add ordering and pagination to main query
        baseQuery += ` ORDER BY s.name ASC LIMIT ${limitNum} OFFSET ${offset}`;

        console.log('Final query:', baseQuery);
        console.log('Query params:', queryParams);

        // Execute main query
        const [spas] = await db.execute(baseQuery, queryParams);

        console.log('Found spas:', spas.length);

        res.json({
            success: true,
            data: {
                spas: spas,
                total: total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });

    } catch (error) {
        console.error('Error fetching verified spas:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch verified spas',
            message: error.message
        });
    }
}); module.exports = router;