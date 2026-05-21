// backend/api/admin_panel.js
const { supabase } = require('../lib/supabase');
const { verifyRequest, handleCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = verifyRequest(req);
  const SUPER_ADMIN = 'dharmchaniyara7368@gmail.com';
  
  if (!user || user.role !== 'admin' || user.email !== SUPER_ADMIN) {
    return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
  }

  const { action } = req.method === 'GET' ? req.query : req.body;

  try {
    switch (action) {
      case 'stats':
        const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: activeUsersCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active');
        const { count: documentsCount } = await supabase.from('notes').select('*', { count: 'exact', head: true });
        const { count: subjectsCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
        const { count: reportsCount } = await supabase.from('reported_documents').select('*', { count: 'exact', head: true });
        const { data: recentDocuments } = await supabase
          .from('notes')
          .select('id, title, uploaded_at, users(name)')
          .order('uploaded_at', { ascending: false })
          .limit(5);
        return res.status(200).json({
          totalUsers: usersCount || 0,
          activeUsers: activeUsersCount || 0,
          totalDocuments: documentsCount || 0,
          totalSubjects: subjectsCount || 0,
          totalReports: reportsCount || 0,
          recentDocuments: recentDocuments ? recentDocuments.map(d => ({
            id: d.id,
            title: d.title,
            uploaded_at: d.uploaded_at,
            uploader_name: d.users?.name || 'Unknown'
          })) : []
        });

      case 'users_list': {
        const { search = '', page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let uQuery = supabase.from('users').select('id, name, email, role, status, google_id', { count: 'exact' });
        if (search) uQuery = uQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        const { data: users, count: uCount } = await uQuery
          .order('id', { ascending: false })
          .range(offset, offset + limit - 1);

        // Fetch user reviews manually to calculate avg rating and review count
        const { data: userReviews, error: reviewsErr } = await supabase
          .from('user_reviews')
          .select('reviewee_id, rating');
        
        const reviewMap = {};
        if (!reviewsErr && userReviews) {
          userReviews.forEach(r => {
            if (!reviewMap[r.reviewee_id]) {
              reviewMap[r.reviewee_id] = { sum: 0, count: 0 };
            }
            reviewMap[r.reviewee_id].sum += r.rating;
            reviewMap[r.reviewee_id].count += 1;
          });
        }

        const usersWithRatings = (users || []).map(u => {
          const ratingData = reviewMap[u.id];
          return {
            ...u,
            avg_rating: ratingData ? (ratingData.sum / ratingData.count).toFixed(1) : 'N/A',
            review_count: ratingData ? ratingData.count : 0
          };
        });

        return res.status(200).json({ users: usersWithRatings, total: uCount });
      }

      case 'user_update':
        const { id: uid, subAction } = req.body;
        if (subAction === 'delete') {
          await supabase.from('users').delete().eq('id', uid);
          return res.status(200).json({ message: 'User deleted.' });
        }
        const newStatus = subAction === 'block' ? 'blocked' : 'active';
        await supabase.from('users').update({ status: newStatus }).eq('id', uid);
        return res.status(200).json({ message: `User ${subAction}ed.` });

      case 'docs_list': {
        const { docSearch = '', docStatus = '' } = req.query;
        let dQuery = supabase.from('notes').select('id, title, category, uploaded_at, status, users(name), subjects(name)');
        if (docSearch) dQuery = dQuery.ilike('title', `%${docSearch}%`);
        if (docStatus) dQuery = dQuery.eq('status', docStatus);
        const { data: docs } = await dQuery.order('uploaded_at', { ascending: false }).limit(100);

        // Fetch ratings manually
        const { data: docRatings, error: ratingsErr } = await supabase
          .from('document_ratings')
          .select('document_id, rating');
        
        const ratingMap = {};
        if (!ratingsErr && docRatings) {
          docRatings.forEach(r => {
            if (!ratingMap[r.document_id]) {
              ratingMap[r.document_id] = { sum: 0, count: 0 };
            }
            ratingMap[r.document_id].sum += r.rating;
            ratingMap[r.document_id].count += 1;
          });
        }

        const docsWithRatings = (docs || []).map(d => {
          const ratingData = ratingMap[d.id];
          return {
            id: d.id,
            title: d.title,
            category: d.category,
            uploaded_at: d.uploaded_at,
            status: d.status,
            file_path: d.file_path,
            uploader_name: d.users?.name || 'Unknown',
            subject_name: d.subjects?.name || 'Unknown',
            avg_rating: ratingData ? (ratingData.sum / ratingData.count).toFixed(1) : 'N/A',
            rating_count: ratingData ? ratingData.count : 0
          };
        });

        return res.status(200).json({ documents: docsWithRatings });
      }

      case 'doc_update':
        const { id: did, status: dStat, subAction: dSub } = req.body;
        if (dSub === 'delete') {
          await supabase.from('notes').delete().eq('id', did);
          return res.status(200).json({ message: 'Document deleted.' });
        }
        await supabase.from('notes').update({ status: dStat }).eq('id', did);
        return res.status(200).json({ message: `Document ${dStat}.` });

      case 'subjects_list':
        const { data: subjs } = await supabase.from('subjects').select('*').order('name');
        return res.status(200).json({ subjects: subjs });

      case 'subject_update':
        const { id: sid, name, code, type, syllabus_file, subAction: sSub } = req.body;
        if (sSub === 'delete') {
          await supabase.from('subjects').delete().eq('id', sid);
          return res.status(200).json({ message: 'Subject deleted.' });
        }
        if (sid) {
          await supabase.from('subjects').update({ name, code, type, syllabus_file }).eq('id', sid);
          return res.status(200).json({ message: 'Subject updated.' });
        } else {
          await supabase.from('subjects').insert({ name, code, type, syllabus_file });
          return res.status(200).json({ message: 'Subject added.' });
        }

      case 'reports_list':
        const { data: reps } = await supabase.from('reported_documents').select('*, notes(title), users(name)').order('created_at', { ascending: false });
        return res.status(200).json({ reports: (reps || []).map(r => ({
          ...r,
          document_title: r.notes?.title || 'Unknown',
          reported_by: r.users?.name || 'Unknown'
        })) });

      case 'report_resolve':
        const { id: rid, reportAction } = req.body;
        if (reportAction === 'delete_document') {
           const { data: reportData } = await supabase.from('reported_documents').select('document_id').eq('id', rid).single();
           if (reportData && reportData.document_id) {
             await supabase.from('notes').delete().eq('id', reportData.document_id);
           }
        }
        await supabase.from('reported_documents').delete().eq('id', rid);
        return res.status(200).json({ message: 'Report resolved.' });

      case 'requests_list':
        const { data: reqs } = await supabase.from('requests').select('*, users(name)').order('created_at', { ascending: false });
        return res.status(200).json({ requests: (reqs || []).map(r => ({
          ...r,
          requested_by: r.users?.name || 'Unknown'
        })) });

      case 'request_update':
        const { id: reqid, status: rStat } = req.body;
        if (rStat === 'delete') {
          await supabase.from('requests').delete().eq('id', reqid);
          return res.status(200).json({ message: 'Request deleted.' });
        }
        await supabase.from('requests').update({ status: rStat }).eq('id', reqid);
        return res.status(200).json({ message: `Request ${rStat}.` });

      case 'user_reviews_details': {
        const { userId } = req.query;
        const { data: reviews, error: reviewsErr } = await supabase
          .from('user_reviews')
          .select('id, rating, comment, created_at, reviewer_id')
          .eq('reviewee_id', parseInt(userId))
          .order('created_at', { ascending: false });
        if (reviewsErr) throw reviewsErr;
        
        const reviewerIds = [...new Set((reviews || []).map(r => r.reviewer_id))];
        let reviewerMap = {};
        if (reviewerIds.length > 0) {
          const { data: reviewers, error: revErr } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', reviewerIds);
          if (revErr) throw revErr;
          (reviewers || []).forEach(u => { reviewerMap[u.id] = u; });
        }
        
        const detailedReviews = (reviews || []).map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          reviewer_name: reviewerMap[r.reviewer_id]?.name || 'Unknown',
          reviewer_email: reviewerMap[r.reviewer_id]?.email || ''
        }));
        
        return res.status(200).json({ reviews: detailedReviews });
      }

      case 'delete_user_review': {
        const { reviewId } = req.body;
        const { error } = await supabase.from('user_reviews').delete().eq('id', parseInt(reviewId));
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      case 'doc_ratings_details': {
        const { docId } = req.query;
        const { data: ratings, error: ratingsErr } = await supabase
          .from('document_ratings')
          .select('id, rating, created_at, user_id')
          .eq('document_id', parseInt(docId))
          .order('created_at', { ascending: false });
        if (ratingsErr) throw ratingsErr;
        
        const userIds = [...new Set((ratings || []).map(r => r.user_id))];
        let userMap = {};
        if (userIds.length > 0) {
          const { data: users, error: usrErr } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds);
          if (usrErr) throw usrErr;
          (users || []).forEach(u => { userMap[u.id] = u; });
        }
        
        const detailedRatings = (ratings || []).map(r => ({
          id: r.id,
          rating: r.rating,
          created_at: r.created_at,
          user_name: userMap[r.user_id]?.name || 'Unknown',
          user_email: userMap[r.user_id]?.email || ''
        }));
        
        return res.status(200).json({ ratings: detailedRatings });
      }

      case 'delete_doc_rating': {
        const { ratingId } = req.body;
        const { error } = await supabase.from('document_ratings').delete().eq('id', parseInt(ratingId));
        if (error) throw error;
        return res.status(200).json({ success: true });
      }
      default:
        return res.status(400).json({ error: 'Invalid action.' });
    }
  } catch (err) {
    console.error('[Admin Panel Error]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
