const pool = require('../config/database');

const printAgeDistributionTable = (distribution, totalUsers) => {
    console.log('\n' + '='.repeat(70));
    console.log('                    AGE DISTRIBUTION REPORT');
    console.log('='.repeat(70));
    console.log(`Total Users: ${totalUsers}`);
    console.log('='.repeat(70));
    console.log('');

    // Table header
    console.log('┌─────────────────────┬──────────────┬─────────────────┬─────────────────┐');
    console.log('│ Age Group           │ Count        │ % Distribution  │ Visual Bar      │');
    console.log('├─────────────────────┼──────────────┼─────────────────┼─────────────────┤');

    // Table rows
    const ageGroups = [
        { label: '< 20', key: 'below20' },
        { label: '20 - 40', key: 'between20And40' },
        { label: '40 - 60', key: 'between40And60' },
        { label: '> 60', key: 'above60' }
    ];

    ageGroups.forEach((group, index) => {
        const count = distribution[group.key];
        const percentage = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(2) : 0;

        // Create visual bar
        const barLength = Math.round(parseFloat(percentage) / 2); // Scale to fit console
        const bar = '█'.repeat(barLength);

        // Format strings with padding
        const labelPadded = group.label.padEnd(19);
        const countPadded = count.toString().padEnd(12);
        const percentPadded = `${percentage}%`.padEnd(15);
        const barPadded = bar.padEnd(15);

        console.log(`│ ${labelPadded} │ ${countPadded} │ ${percentPadded} │ ${barPadded} │`);

        // Add separator between rows (except last)
        if (index < ageGroups.length - 1) {
            console.log('├─────────────────────┼──────────────┼─────────────────┼─────────────────┤');
        }
    });

    console.log('└─────────────────────┴──────────────┴─────────────────┴─────────────────┘');
    console.log('');
    console.log('='.repeat(70));
    console.log('');
};

// Generate Age Distribution Report
const generateAgeDistributionReport = async (req, res) => {
    try {
        // Query all users
        const result = await pool.query('SELECT age FROM public.users WHERE age IS NOT NULL');

        const totalUsers = result.rows.length;

        if (totalUsers === 0) {
            console.log('\n⚠️  No users found in database to generate report.\n');
            return res.status(404).json({
                success: false,
                message: 'No users found in database'
            });
        }

        // Initialize age groups
        const distribution = {
            below20: 0,
            between20And40: 0,
            between40And60: 0,
            above60: 0
        };

        // Categorize ages
        result.rows.forEach(row => {
            const age = row.age;

            if (age < 20) {
                distribution.below20++;
            } else if (age >= 20 && age <= 40) {
                distribution.between20And40++;
            } else if (age > 40 && age <= 60) {
                distribution.between40And60++;
            } else if (age > 60) {
                distribution.above60++;
            }
        });

        // Calculate percentages
        const percentages = {
            below20: totalUsers > 0 ? ((distribution.below20 / totalUsers) * 100).toFixed(2) : 0,
            between20And40: totalUsers > 0 ? ((distribution.between20And40 / totalUsers) * 100).toFixed(2) : 0,
            between40And60: totalUsers > 0 ? ((distribution.between40And60 / totalUsers) * 100).toFixed(2) : 0,
            above60: totalUsers > 0 ? ((distribution.above60 / totalUsers) * 100).toFixed(2) : 0
        };

        // Print formatted table in console
        printAgeDistributionTable(distribution, totalUsers);

        // Also log simple format
        console.log('📊 SIMPLE FORMAT:');
        console.log('─'.repeat(40));
        console.log('Age Group      % Distribution');
        console.log('─'.repeat(40));
        console.log(`< 20           ${percentages.below20}%`);
        console.log(`20 to 40       ${percentages.between20And40}%`);
        console.log(`40 to 60       ${percentages.between40And60}%`);
        console.log(`> 60           ${percentages.above60}%`);
        console.log('─'.repeat(40));
        console.log('');

        // Return JSON response
        return res.status(200).json({
            success: true,
            message: 'Age distribution report generated successfully',
            totalUsers,
            distribution: {
                'below20': {
                    count: distribution.below20,
                    percentage: parseFloat(percentages.below20)
                },
                '20to40': {
                    count: distribution.between20And40,
                    percentage: parseFloat(percentages.between20And40)
                },
                '40to60': {
                    count: distribution.between40And60,
                    percentage: parseFloat(percentages.between40And60)
                },
                'above60': {
                    count: distribution.above60,
                    percentage: parseFloat(percentages.above60)
                }
            }
        });

    } catch (error) {
        console.error('Error generating age distribution report:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating report',
            error: error.message
        });
    }
};

module.exports = {
    generateAgeDistributionReport
}