import { 
    query, 
    where, 
    getDocs, 
    DocumentData, 
    QuerySnapshot,
    CollectionReference,
    QueryConstraint,
} from 'firebase/firestore';

/**
 * 批量执行 Firebase IN 查询，自动处理超过30个值的限制
 * Firebase 的 IN 查询最多支持30个值，这个函数会自动分批查询并合并结果
 * 
 * @param collectionRef - Firestore 集合引用
 * @param fieldPath - 要查询的字段路径（如 "__name__" 用于文档ID查询）
 * @param values - 要查询的值数组
 * @param additionalConstraints - 额外的查询约束
 * @returns 合并后的查询结果
 */
export async function batchInQuery(
    collectionRef: CollectionReference<DocumentData>,
    fieldPath: string,
    values: string[],
    additionalConstraints: QueryConstraint[] = []
): Promise<QuerySnapshot<DocumentData>> {
    const BATCH_SIZE = 30;
    const filteredValues = values.filter(Boolean); // 过滤掉空值
    
    if (filteredValues.length === 0) {
        // 创建一个空查询并执行它以返回真正的 QuerySnapshot
        const emptyQuery = query(collectionRef, where("__name__", "==", "non-existent-doc"));
        return await getDocs(emptyQuery);
    }

    // 如果值少于等于30个，直接查询
    if (filteredValues.length <= BATCH_SIZE) {
        const q = query(
            collectionRef,
            where(fieldPath, "in", filteredValues),
            ...additionalConstraints
        );
        return await getDocs(q);
    }

    // 分批查询
    const batches: string[][] = [];
    for (let i = 0; i < filteredValues.length; i += BATCH_SIZE) {
        batches.push(filteredValues.slice(i, i + BATCH_SIZE));
    }

    const queryPromises = batches.map(async (batch) => {
        const q = query(
            collectionRef,
            where(fieldPath, "in", batch),
            ...additionalConstraints
        );
        return await getDocs(q);
    });

    const results = await Promise.all(queryPromises);

    // 合并所有结果
    const allDocs = results.flatMap(result => result.docs);
    
    // 如果没有结果，返回第一个查询的空结果
    if (allDocs.length === 0 && results.length > 0) {
        return results[0];
    }
    
    // 创建合并后的查询结果对象，使用类型断言
    const mergedResult = {
        docs: allDocs,
        empty: allDocs.length === 0,
        size: allDocs.length,
        metadata: results[0]?.metadata || { hasPendingWrites: false, fromCache: false },
        query: results[0]?.query,
        forEach: (callback: (doc: DocumentData) => void) => {
            allDocs.forEach(callback);
        },
        // 添加缺失的方法
        docChanges: () => [],
        toJSON: () => ({ docs: allDocs, size: allDocs.length })
    } as unknown as QuerySnapshot<DocumentData>;

    return mergedResult;
}

/**
 * 用于 React hooks 的批量 IN 查询
 * 返回类似 useCollection 的结果格式
 * 
 * @param collectionRef - Firestore 集合引用
 * @param fieldPath - 要查询的字段路径
 * @param values - 要查询的值数组
 * @param additionalConstraints - 额外的查询约束
 * @returns Promise<QuerySnapshot | null>
 */
export async function batchInQueryForHooks(
    collectionRef: CollectionReference<DocumentData>,
    fieldPath: string,
    values: string[],
    additionalConstraints: QueryConstraint[] = []
): Promise<QuerySnapshot<DocumentData> | null> {
    try {
        if (!values || values.length === 0) {
            return null;
        }
        
        return await batchInQuery(collectionRef, fieldPath, values, additionalConstraints);
    } catch (error) {
        console.error('Batch IN query error:', error);
        throw error;
    }
}
