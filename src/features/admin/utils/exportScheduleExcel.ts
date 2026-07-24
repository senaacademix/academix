import ExcelJS from 'exceljs';

const formatTime12h = (timeStr: string): string => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const period = h >= 12 ? 'p.m.' : 'a.m.';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    const hFormatted = h < 10 ? `0${h}` : `${h}`;
    return `${hFormatted}:${m} ${period}`;
};

const formatDateEs = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '';
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);
        const day = d.getUTCDate().toString().padStart(2, '0');
        const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return String(dateInput);
    }
};

export const exportScheduleToExcel = async (
    programs: any[],
    scheduleTitle: string,
    startDate?: string | Date | null,
    endDate?: string | Date | null
) => {
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

    // 1. FIRST WORKSHEET: Complete Schedule Master List (Horario General)
    const summarySheet = workbook.addWorksheet('Horario General');

    // Title Row
    summarySheet.mergeCells('A1:J1');
    const sumTitleCell = summarySheet.getCell('A1');
    sumTitleCell.value = `${scheduleTitle} - Consolidado General de Horarios`;
    sumTitleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    sumTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sumTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

    // Subtitle Row with Schedule Name and Period Start/End Dates
    summarySheet.mergeCells('A2:J2');
    const sumSubtitleCell = summarySheet.getCell('A2');
    const totalGroups = programs.reduce((acc, p) => acc + (p.groups?.length || 0), 0);
    const startFormatted = formatDateEs(startDate);
    const endFormatted = formatDateEs(endDate);
    const periodStr = (startFormatted && endFormatted)
        ? `Período: ${startFormatted} al ${endFormatted}`
        : 'Período: Vigente';

    sumSubtitleCell.value = `Nombre del Horario: ${scheduleTitle} | ${periodStr} | Total Programas: ${programs.length} | Total Grupos: ${totalGroups} | Generado: ${new Date().toLocaleDateString('es-ES')}`;
    sumSubtitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1F2937' } };
    sumSubtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Header Row
    const summaryHeaders = [
        'Programa',
        'Grupo / Ficha',
        'Franja Grupo',
        'Período',
        'Ambiente',
        'Materia / Asignatura',
        'Docente',
        'Día',
        'Horario Clase',
        'Duración'
    ];

    const sumHeaderRow = summarySheet.addRow(summaryHeaders);
    sumHeaderRow.height = 26;
    sumHeaderRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
    });

    const colWidths = [28, 18, 24, 16, 20, 32, 28, 14, 22, 14];
    colWidths.forEach((w, idx) => {
        summarySheet.getColumn(idx + 1).width = w;
    });

    const dayNameMap: Record<string, string> = {
        MONDAY: 'LUNES', TUESDAY: 'MARTES', WEDNESDAY: 'MIÉRCOLES',
        THURSDAY: 'JUEVES', FRIDAY: 'VIERNES', SATURDAY: 'SÁBADO', SUNDAY: 'DOMINGO'
    };

    programs.forEach(program => {
        program.groups?.forEach((group: any) => {
            const shiftStr = (group.startTime && group.endTime)
                ? `${formatTime12h(group.startTime)} - ${formatTime12h(group.endTime)}`
                : 'Por definir';
            
            group.courses?.forEach((course: any) => {
                const teacherName = course.teacher?.name || 'Sin docente';
                const envName = group.environment?.name || 'Sin asignar';
                const periodName = group.period?.name || 'N/A';

                if (course.schedules && course.schedules.length > 0) {
                    course.schedules.forEach((sched: any) => {
                        let startStr = sched.startTime;
                        let endStr = sched.endTime;

                        if (group.startTime && group.endTime) {
                            const gStartH = parseInt(group.startTime.split(':')[0], 10);
                            const gEndH = parseInt(group.endTime.split(':')[0], 10);
                            const sStartH = parseInt(sched.startTime.split(':')[0], 10);
                            const sEndH = parseInt(sched.endTime.split(':')[0], 10);
                            if (sStartH >= gStartH && sEndH <= gEndH) {
                                startStr = group.startTime;
                                endStr = group.endTime;
                            }
                        }

                        const startH = parseInt(startStr.split(':')[0], 10);
                        const endH = parseInt(endStr.split(':')[0], 10);
                        const durationHrs = Math.max(1, endH - startH);

                        const rowData = [
                            program.name || 'Sin programa',
                            group.name || 'Sin grupo',
                            shiftStr,
                            periodName,
                            envName,
                            course.title || 'Sin título',
                            teacherName,
                            dayNameMap[sched.dayOfWeek] || sched.dayOfWeek,
                            `${formatTime12h(startStr)} - ${formatTime12h(endStr)}`,
                            `${durationHrs}h`
                        ];

                        const addedRow = summarySheet.addRow(rowData);
                        addedRow.height = 22;
                        addedRow.eachCell((cell, colIdx) => {
                            cell.font = { name: 'Arial', size: 10 };
                            cell.alignment = {
                                vertical: 'middle',
                                horizontal: (colIdx === 2 || colIdx === 3 || colIdx === 8 || colIdx === 9 || colIdx === 10) ? 'center' : 'left'
                            };
                            cell.border = {
                                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                                right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                            };
                        });
                    });
                } else {
                    const rowData = [
                        program.name || 'Sin programa',
                        group.name || 'Sin grupo',
                        shiftStr,
                        periodName,
                        envName,
                        course.title || 'Sin título',
                        teacherName,
                        'Pendiente',
                        'Sin asignar',
                        '-'
                    ];
                    const addedRow = summarySheet.addRow(rowData);
                    addedRow.height = 22;
                    addedRow.eachCell((cell, colIdx) => {
                        cell.font = { name: 'Arial', size: 10, italic: true };
                        cell.alignment = {
                            vertical: 'middle',
                            horizontal: (colIdx === 2 || colIdx === 3 || colIdx === 8 || colIdx === 9 || colIdx === 10) ? 'center' : 'left'
                        };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                        };
                    });
                }
            });
        });
    });

    // 2. INDIVIDUAL GROUP SHEETS
    programs.forEach(program => {
        program.groups?.forEach((group: any) => {
            let sheetName = `${group.name || 'Grupo'}`.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
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
            const shiftInfo = (group.startTime && group.endTime)
                ? ` | Franja: ${formatTime12h(group.startTime)} - ${formatTime12h(group.endTime)}`
                : '';
            subtitleCell.value = `Ambiente: ${group.environment?.name || 'Sin asignar'} | Período: ${group.period?.name || 'N/A'}${shiftInfo}`;
            subtitleCell.font = { name: 'Arial', size: 12, bold: true };
            subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

            // Header row
            const headerRow = sheet.addRow(['Hora', ...days]);
            headerRow.height = 30;
            headerRow.eachCell((cell) => {
                cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });

            // Set column widths
            sheet.getColumn(1).width = 22;
            for (let i = 2; i <= 8; i++) {
                sheet.getColumn(i).width = 25;
            }

            // Generate cells
            let grid: any[][] = Array(timeSlots.length - 1).fill(null).map(() => Array(8).fill(null));
            const mergesToApply: Array<{ topRow: number; leftCol: number; bottomRow: number; rightCol: number; title: string; teacher: string }> = [];

            group.courses?.forEach((course: any) => {
                course.schedules?.forEach((sched: any) => {
                    let startH = parseInt(sched.startTime.split(':')[0], 10);
                    let endH = parseInt(sched.endTime.split(':')[0], 10);
                    let endM = parseInt(sched.endTime.split(':')[1], 10);

                    if (group.startTime && group.endTime) {
                        const gStartH = parseInt(group.startTime.split(':')[0], 10);
                        const gEndH = parseInt(group.endTime.split(':')[0], 10);
                        const gEndM = parseInt(group.endTime.split(':')[1], 10);
                        startH = Math.min(startH, gStartH);
                        endH = Math.max(endH, gEndH);
                        if (endH === gEndH && gEndM > 0) endM = gEndM;
                    }

                    const startIdx = startH - 6;
                    const endIdx = endH - 6 + (endM > 0 ? 1 : 0);
                    const dayIdx = getDayIndex(sched.dayOfWeek);

                    if (startIdx >= 0 && endIdx >= 0 && dayIdx > 0) {
                        const topRow = 4 + startIdx;
                        const bottomRow = 4 + endIdx - 1;
                        const col = dayIdx + 1;

                        for (let i = startIdx; i < endIdx; i++) {
                            if (i < grid.length) {
                                grid[i][dayIdx] = {
                                    title: course.title,
                                    teacher: course.teacher?.name || 'Sin docente',
                                    isFirst: i === startIdx
                                };
                            }
                        }

                        if (bottomRow > topRow) {
                            mergesToApply.push({
                                topRow,
                                leftCol: col,
                                bottomRow,
                                rightCol: col,
                                title: course.title,
                                teacher: course.teacher?.name || 'Sin docente'
                            });
                        }
                    }
                });
            });

            // Draw grid with 12-hour formatted time labels
            for (let r = 0; r < timeSlots.length - 1; r++) {
                const timeLabel = `${formatTime12h(timeSlots[r])} - ${formatTime12h(timeSlots[r+1])}`;
                const row = sheet.addRow([timeLabel]);
                row.height = 40;
                
                // Time column style
                row.getCell(1).font = { bold: true, size: 9 };
                row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell(1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                for (let c = 1; c <= 7; c++) {
                    const cell = row.getCell(c + 1);
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    
                    const item = grid[r][c];
                    if (item) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; // Light blue
                        cell.font = { name: 'Arial', size: 10 };
                        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                        if (item.isFirst) {
                            cell.value = `${item.title}\nDocente: ${item.teacher}`;
                        }
                    }
                }
            }

            // Apply merged ranges for multi-hour blocks
            mergesToApply.forEach(m => {
                try {
                    sheet.mergeCells(m.topRow, m.leftCol, m.bottomRow, m.rightCol);
                    const mergedCell = sheet.getCell(m.topRow, m.leftCol);
                    mergedCell.value = `${m.title}\nDocente: ${m.teacher}`;
                    mergedCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    mergedCell.font = { name: 'Arial', size: 10, bold: true };
                } catch (e) {
                    console.error("Error merging cells:", e);
                }
            });
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
