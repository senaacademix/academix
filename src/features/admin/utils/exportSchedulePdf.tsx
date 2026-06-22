import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { padding: 30, backgroundColor: '#ffffff', flexDirection: 'column' },
    header: { marginBottom: 20, display: 'flex', flexDirection: 'column' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 5, textAlign: 'center' },
    subtitle: { fontSize: 12, color: '#4b5563', marginBottom: 5, textAlign: 'center' },
    table: { display: 'flex', flexDirection: 'column', width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e7eb' },
    tableRow: { flexDirection: 'row', minHeight: 35 },
    tableColHeader: { width: '12.5%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f3f4f6', padding: 5, justifyContent: 'center', alignItems: 'center' },
    tableColTime: { width: '12.5%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', padding: 5, justifyContent: 'center', alignItems: 'center' },
    tableCol: { width: '12.5%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e7eb', padding: 2 },
    tableCellHeader: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
    tableCellTime: { fontSize: 8, fontWeight: 'bold', textAlign: 'center', color: '#4b5563' },
    tableCell: { fontSize: 8, textAlign: 'center' },
    courseCell: { backgroundColor: '#e0f2fe', padding: 4, borderRadius: 2, height: '100%', width: '100%' },
    courseTitle: { fontSize: 8, fontWeight: 'bold', color: '#0369a1', marginBottom: 2 },
    courseTeacher: { fontSize: 7, color: '#0c4a6e' }
});

const days = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
];

const getDayIndex = (dayCode: string) => {
    const mapping: Record<string, number> = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7 };
    return mapping[dayCode] || 0;
};

const ScheduleDocument = ({ programs, scheduleTitle }: { programs: any[], scheduleTitle: string }) => {
    const pages: any[] = [];

    programs.forEach(program => {
        program.groups?.forEach((group: any) => {
            let grid: any[][] = Array(timeSlots.length - 1).fill(null).map(() => Array(8).fill(null));

            group.courses?.forEach((course: any) => {
                course.schedules?.forEach((sched: any) => {
                    const startH = parseInt(sched.startTime.split(':')[0], 10);
                    const endH = parseInt(sched.endTime.split(':')[0], 10);
                    const endM = parseInt(sched.endTime.split(':')[1], 10);
                    const startIdx = startH - 6;
                    const endIdx = endH - 6 + (endM > 0 ? 1 : 0);
                    const dayIdx = getDayIndex(sched.dayOfWeek);

                    if (startIdx >= 0 && endIdx >= 0 && dayIdx > 0) {
                        for (let i = startIdx; i < endIdx && i < grid.length; i++) {
                            grid[i][dayIdx] = {
                                title: course.title || 'Sin título',
                                teacher: course.teacher?.name || course.teacher?.email || 'Sin docente',
                                isFirst: i === startIdx
                            };
                        }
                    }
                });
            });

            pages.push(
                <Page size="A4" orientation="landscape" style={styles.page} key={`${program.id}-${group.id}`}>
                    <View style={styles.header}>
                        <View style={{ height: 30, marginBottom: 5, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={styles.title}>{scheduleTitle || 'Horarios'}</Text>
                        </View>
                        <View style={{ height: 18, marginBottom: 2, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={styles.subtitle}>{group.name || 'Grupo'} - {program.name || 'Programa'}</Text>
                        </View>
                        <View style={{ height: 18, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={styles.subtitle}>Ambiente: {group.environment?.name || 'Sin asignar'} | Período: {group.period?.name || 'N/A'}</Text>
                        </View>
                    </View>

                    <View style={styles.table}>
                        <View style={styles.tableRow}>
                            <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Hora</Text></View>
                            {days.map(day => (
                                <View style={styles.tableColHeader} key={day}><Text style={styles.tableCellHeader}>{day}</Text></View>
                            ))}
                        </View>

                        {grid.map((row, rIdx) => (
                            <View style={styles.tableRow} key={rIdx}>
                                <View style={styles.tableColTime}>
                                    <Text style={styles.tableCellTime}>{timeSlots[rIdx]} - {timeSlots[rIdx+1]}</Text>
                                </View>
                                {row.slice(1).map((cell, cIdx) => (
                                    <View style={styles.tableCol} key={cIdx}>
                                        {cell && cell.isFirst ? (
                                            <View style={styles.courseCell}>
                                                <Text style={styles.courseTitle}>{cell.title}</Text>
                                                <Text style={styles.courseTeacher}>{cell.teacher}</Text>
                                            </View>
                                        ) : cell ? (
                                            <View style={styles.courseCell}></View>
                                        ) : null}
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                </Page>
            );
        });
    });

    if (pages.length === 0) {
        pages.push(
            <Page size="A4" orientation="landscape" style={styles.page} key="empty">
                <View style={styles.header}>
                    <View style={{ height: 30, marginBottom: 5, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={styles.title}>{scheduleTitle || 'Horarios'}</Text>
                    </View>
                    <View style={{ height: 18, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={styles.subtitle}>No hay horarios disponibles para exportar.</Text>
                    </View>
                </View>
            </Page>
        );
    }

    return <Document>{pages}</Document>;
};

export const exportScheduleToPdf = async (programs: any[], scheduleTitle: string) => {
    const blob = await pdf(<ScheduleDocument programs={programs} scheduleTitle={scheduleTitle} />).toBlob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scheduleTitle.replace(/\s+/g, '_')}_Horarios.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
};
