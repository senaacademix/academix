import ExcelJS from 'exceljs';

export const exportScheduleToExcel = async (programs: any[], scheduleTitle: string) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AcademiX';
    workbook.lastModifiedBy = 'AcademiX';
    workbook.created = new Date();
    workbook.modified = new Date();

    const days = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
    const timeSlots = [
        '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
        '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
        '18:00', '19:00', '20:00', '21:00', '22:00'
    ];

    const getDayIndex = (dayCode: string) => {
        const mapping: Record<string, number> = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7 };
        return mapping[dayCode] || 0;
    };

    programs.forEach(program => {
        program.groups?.forEach((group: any) => {
            // Validate sheet name length (max 31 chars in Excel)
            let sheetName = `${group.name || 'Grupo'}`.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
            // Ensure unique names if needed, though usually group names are unique
            let sheet = workbook.addWorksheet(sheetName);

            // Title
            sheet.mergeCells('A1:H1');
            const titleCell = sheet.getCell('A1');
            titleCell.value = `${scheduleTitle} - ${group.name} (${program.name})`;
            titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

            // Subtitle
            sheet.mergeCells('A2:H2');
            const subtitleCell = sheet.getCell('A2');
            subtitleCell.value = `Ambiente: ${group.environment?.name || 'Sin asignar'} | Período: ${group.period?.name || 'N/A'}`;
            subtitleCell.font = { name: 'Arial', size: 12, bold: true };
            subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

            // Header row
            const headerRow = sheet.addRow(['Hora', ...days]);
            headerRow.height = 30;
            headerRow.eachCell((cell, colNumber) => {
                cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });

            // Set column widths
            sheet.getColumn(1).width = 15;
            for (let i = 2; i <= 8; i++) {
                sheet.getColumn(i).width = 25;
            }

            // Generate cells
            // For simplicity, we create a matrix
            let grid: any[][] = Array(timeSlots.length - 1).fill(null).map(() => Array(8).fill(null));

            // Populate grid with classes
            group.courses?.forEach((course: any) => {
                course.schedules?.forEach((sched: any) => {
                    const startH = parseInt(sched.startTime.split(':')[0], 10);
                    const endH = parseInt(sched.endTime.split(':')[0], 10);
                    const endM = parseInt(sched.endTime.split(':')[1], 10);
                    const startIdx = startH - 6;
                    const endIdx = endH - 6 + (endM > 0 ? 1 : 0);
                    const dayIdx = getDayIndex(sched.dayOfWeek);

                    if (startIdx >= 0 && endIdx >= 0 && dayIdx > 0) {
                        for (let i = startIdx; i < endIdx; i++) {
                            grid[i][dayIdx] = {
                                title: course.title,
                                teacher: course.teacher?.name || 'Sin docente',
                                isFirst: i === startIdx,
                                rowspan: endIdx - startIdx
                            };
                        }
                    }
                });
            });

            // Draw grid
            for (let r = 0; r < timeSlots.length - 1; r++) {
                const row = sheet.addRow([`${timeSlots[r]} - ${timeSlots[r+1]}`]);
                row.height = 40;
                
                // Time column style
                row.getCell(1).font = { bold: true };
                row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell(1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                for (let c = 1; c <= 7; c++) {
                    const cell = row.getCell(c + 1);
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    
                    const item = grid[r][c];
                    if (item) {
                        if (item.isFirst) {
                            cell.value = `${item.title}\nDocente: ${item.teacher}`;
                            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; // Light blue
                            cell.font = { name: 'Arial', size: 10 };
                        }
                    }
                }
            }
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scheduleTitle.replace(/\s+/g, '_')}_Horarios.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};
