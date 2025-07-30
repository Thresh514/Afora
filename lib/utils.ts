import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// 解析时间表数据的工具函数
export const parseScheduleData = (scheduleString: string) => {
    try {
        // 尝试提取JSON部分
        const jsonMatch = scheduleString.match(/^(\{.*?\})/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            return {
                structured: jsonData,
                readable: scheduleString.split(' | Readable: ')[1] || scheduleString
            };
        }
        
        // 如果没有JSON格式，返回原始字符串
        return {
            structured: null,
            readable: scheduleString
        };
    } catch (error) {
        // 如果解析失败，返回原始字符串
        return {
            structured: null,
            readable: scheduleString
        };
    }
};

// 格式化时间表显示
export const formatScheduleForDisplay = (scheduleString: string) => {
    const parsed = parseScheduleData(scheduleString);
    
    if (parsed.structured) {
        const days = Object.keys(parsed.structured);
        return days.map(day => {
            const data = parsed.structured[day];
            const timeRanges = data.timeRanges.join(', ');
            const hours = data.totalHours;
            return `${day}: ${timeRanges} (${hours}小时)`;
        }).join('\n');
    }
    
    return parsed.readable;
};
